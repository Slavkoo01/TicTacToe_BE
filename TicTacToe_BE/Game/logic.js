const { func } = require("joi");
const { verifyToken } = require("../middleware/auth");
const {
  insertNewGame,
  updateGameStatus,
  insertGameHistory,
  updateResultGameHistory,
  updateGameHistory,
  insertMove,
  fetchGame
} = require("./socketIOQueries");
const { calculateWinner, findBestMove, calculateResult } = require("./utility");
const pendingGameStatus = "pending";
const activeGameStatus = "active";
const finishedGameStatus = "finished";
const abortedGameStatus = "aborted";
const player1Sign = "X";
const player2Sign = "O";

const gameHandler = {
  async createGame(socket, { token, gameType }, games) {
    try {
      const { user } = verifyToken(token);
      console.log("User authenticated for creation:", user);
      const gameId = await insertNewGame(user.id, gameType, pendingGameStatus);
      await insertGameHistory(user.id, null, null, player1Sign, gameId);
      console.log("Game Created Id:", gameId);
      if (!games[gameId]) {
        games[gameId] = {
          roomId: gameId,
          squares: Array(9).fill(null),
          xIsNext: true,
          status: pendingGameStatus,
          winner: null,
          players: [
            {
              id: socket.id,
              sign: player1Sign,
              userId: user.id
            }
          ]
        };
      }
      socket.emit("gameCreated", { ReturnedGameId: gameId });
      socket.emit("playerAssigned", { sign: player1Sign });
      socket.emit("changeStatus", { status: pendingGameStatus });
    } catch (error) {
      console.error("Error during game creation:", error);
      socket.emit("error", { message: "Failed to create game" });
    }
  },

  checkStatus(socket, { token, gameId }, games) {
    const { user } = verifyToken(token);
    if (user) {
      console.log("CheckStatus for game: ", gameId);
      console.log(games[gameId]);
      if (!games[gameId]) {
        console.error("Game is aborted!");
        socket.emit("changeStatus", { status: abortedGameStatus });
        return;
      }
      const status = games[gameId].status;
      socket.emit("changeStatus", {
        status: status,
        winner: games[gameId].winner
      });
      console.log("Game status: ", status);
    }
  },
  async joinRoom(socket, { token, gameId }, games, io) {
    console.log("joiningRoom");
    console.log("GameId", gameId);

    const roomId = gameId;
    const { user } = verifyToken(token);
    if (!user) {
      return;
    }
    console.log("User authenticated for joining:", user);

    let playerSign = "";
    let reconnecting = false;

    if (!games[gameId]) {
      console.log("There was no game found with id:", gameId);
      socket.emit("error", { message: `No game with ${gameId} id` });
      return;
    }

    const existingPlayers = games[gameId].players;
    const isPlayerInGame = existingPlayers.some(
      (player) => player.userId === user.id
    );

    if (!isPlayerInGame) {
      const gameData = await fetchGame(gameId);
      if (!gameData) {
        socket.emit("error", { message: "Game data could not be fetched" });
        return;
      }

      console.log(
        `USERID: ${user.id}\nPlayer2Id: ${gameData.player2_id}\nPlayer1_Id: ${gameData.player1_id}`
      );

      // Initialize
      if (!games[gameId]) {
        games[gameId] = {
          players: [],
          squares: [...Array(9).fill(null)],
          xIsNext: true
        };
      }

      if (user.id === gameData.player1_id) {
        // 1 reconnecting
        playerSign = gameData.player1_sign;
        reconnecting = true;
      } else if (!gameData.player2_id) {
        // New 2player joins
        const player2Sign = gameData.player1_sign === "X" ? "O" : "X";
        playerSign = player2Sign;
        updateGameHistory(
          gameData.player1_id,
          user.id,
          null,
          gameData.player1_sign,
          gameId
        );
      } else if (user.id === gameData.player2_id) {
        //  2 reconnecting
        playerSign = gameData.player1_sign === "X" ? "O" : "X";
        reconnecting = true;
      } else {
        socket.emit("error", { message: "You cannot join this lobby" });
        return;
      }

      games[gameId].players.push({
        id: socket.id,
        sign: playerSign,
        userId: user.id
      });

      //Handle start
      if (games[roomId].players.length === 2) {
        console.log("Current game for the ID:\n", games[gameId]);
        socket.emit("joinedRoom");

        changeAndUpdateGameStatus(activeGameStatus, gameId, games, io);
        games[gameId].players.forEach((player) => {
          io.to(player.id).emit("startGame", {
            squares: games[gameId].squares,
            xIsNext: games[gameId].xIsNext,
            sign: player.sign
          });
        });
        if (reconnecting) {
          io.to(games[roomId].players[0].id).emit("notification", {
            message: "Opponente reconnected!"
          });
        }
      }
    } else {
      socket.emit("error", { message: "You are already in the lobby" });
    }
  },
  async makeMove(socket, { roomId, squareIndex }, games, io) {
    const game = games[roomId];

    if (!game || game.status === finishedGameStatus) {
      console.error("Game is either finished or does not exist.");
      return;
    }

    if (game.squares[squareIndex]) {
      console.error("Square is already filled.");
      return;
    }

    // Ensure the current player is moving
    const player = game.players.find((p) => p.id === socket.id);
    if (!player) {
      console.error("Player not found in this game.");
      return;
    }

    const currentPlayerSign = game.xIsNext ? "X" : "O";
    if (player.sign !== currentPlayerSign) {
      io.to(socket.id).emit("error", { message: "It's not your turn." });
      return;
    }

    game.squares[squareIndex] = currentPlayerSign;
    game.xIsNext = !game.xIsNext;

    console.log(
      `Move made in room ${roomId} at index ${squareIndex} by ${currentPlayerSign}`
    );

    const winner = calculateWinner(game.squares);

    if (winner) {
      game.players.forEach((player) => {
        io.to(player.id).emit("gameOver", { winner, squares: game.squares });
      });
      games[roomId].winner = winner;

      await changeAndUpdateGameStatus(finishedGameStatus, roomId, games, io);
      console.log("WINNNER");
      const player1 = games[roomId].players[0];
      const result = calculateResult(winner, player1.sign);

      await updateResultGameHistory(result, roomId);
      await insertMove(roomId, player.userId, squareIndex);
    } else {
      // No winner
      game.players.forEach((player) => {
        io.to(player.id).emit("moveMade", {
          squares: game.squares,
          xIsNext: game.xIsNext
        });
      });

      await insertMove(roomId, player.userId, squareIndex);
    }
  },
  playWithBot(socket, { squares }) {
    console.log("BOTGAME");
    const winner = calculateWinner(squares);

    if (winner) {
      socket.emit("gameOver", { winner, squares });
      return;
    }

    const botMove = findBestMove(squares);

    if (botMove !== null) {
      squares[botMove] = "O";

      const winnerAfterMove = calculateWinner(squares);
      if (winnerAfterMove) {
        socket.emit("gameOver", { winner: winnerAfterMove, squares });
      } else {
        socket.emit("moveMade", { squares, xIsNext: true });
      }
    }
  },
  leaveRoom(socket, { gameId }, games, io) {
    console.log(`User ${socket.id} left game ${gameId}`);

    const game = games[gameId];

    if (!game) {
      console.error(`Game ${gameId} not found`);
      return;
    }

    const playerIndex = game.players.findIndex(
      (player) => player.id === socket.id
    );

    if (playerIndex !== -1) {
      game.players.splice(playerIndex, 1);
      console.log(`Player ${socket.id} removed from game ${gameId}`);

      if (game.players.length === 0) {
        // No players remaining
        changeAndUpdateGameStatus(abortedGameStatus, gameId, games, io);
        delete games[gameId];
        console.log(`Game ${gameId} deleted due to no players remaining`);
      } else {
        const remainingPlayer = game.players[0];

        // Inform
        if (remainingPlayer) {
          io.to(remainingPlayer.id).emit("error", {
            message: "Your opponent has left the game."
          });
          changeAndUpdateGameStatus(pendingGameStatus, gameId, games, io);
        } else {
          console.error("No remaining player to notify.");
        }
      }
    } else {
      console.error(`Player ${socket.id} not found in game ${gameId}`);
    }
  },
  handleDisconnect(socket, games, io) {
    console.log(`User ${socket.id} disconnected`);

    let foundGame = null;
    let playerIndex = -1;

    for (const [gameId, game] of Object.entries(games)) {
      playerIndex = game.players.findIndex((player) => player.id === socket.id);
      if (playerIndex !== -1) {
        foundGame = gameId;
        break;
      }
    }

    if (!foundGame) {
      console.error(`Player ${socket.id} is not found in any game`);
      return;
    }

    const game = games[foundGame];
    game.players.splice(playerIndex, 1);

    console.log(`Player ${socket.id} disconnected from game ${foundGame}`);

    if (game.players.length === 0) {
      changeAndUpdateGameStatus(abortedGameStatus, foundGame, games, io);
      delete games[foundGame];
      console.log(`Game ${foundGame} deleted due to no players remaining`);
    } else {
      // If the game isn't finished, set it to pending
      if (game.status !== finishedGameStatus) {
        const remainingPlayer = game.players[0];
        if (remainingPlayer) {
          io.to(remainingPlayer.id).emit("error", {
            message: "Your opponent has disconnected from the game."
          });
          changeAndUpdateGameStatus(pendingGameStatus, foundGame, games, io);
        } else {
          console.error("No remaining player to notify.");
        }
      } else {
        console.log(
          `Game ${foundGame} already finished, no need to update status.`
        );
      }
    }
  }
};
function changeAndUpdateGameStatus(status, gameId, games, io) {
  const finishedOrAbortedStatuses = [finishedGameStatus, abortedGameStatus];

  if (
    games[gameId] &&
    !finishedOrAbortedStatuses.includes(games[gameId].status)
  ) {
    games[gameId].status = status;

    games[gameId].players.forEach((player) => {
      io.to(player.id).emit("changeStatus", { status: status });
    });

    updateGameStatus(gameId, status);
  }
}
module.exports = gameHandler;
