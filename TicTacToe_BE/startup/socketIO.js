const socketIO = require("socket.io");
const pool = require("../startup/db");
const { verifyToken } = require("../middleware/auth");
const {
  insertNewGame,
  updateGameStatus,
  insertGameHistory,
  updateResultGameHistory,
  updateGameHistory,
  insertMove,
  fetchGame
} = require("../socketIOQueries/socketIOQueries");
const pendingGameStatus = "pending";
const activeGameStatus = "active";
const finishedGameStatus = "finished";
const abortedGameStatus = "aborted";
const player1Sign = "X";
const player2Sign = "O";

function initSocketIO(server) {
  const io = socketIO(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  const games = [];

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("createGame", async ({ token, gameType }) => {
      try {
        const { user } = verifyToken(token);
        console.log("User authenticated for creation:", user);
        const gameId = await insertNewGame(
          user.id,
          gameType,
          pendingGameStatus
        );
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
    });

    socket.on("checkStatus", ({ token, gameId }) => {
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
        socket.emit("changeStatus", { status: status, winner: games[gameId].winner });
        console.log("Game status: ", status);
      }
    });

   socket.on("joinRoom", async ({ token, gameId }) => {
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

    // Check if the game exists
    if (!games[gameId]) {
        console.log("There was no game found with id:", gameId);
        socket.emit("error", { message: `No game with ${gameId} id` });
        return;
    }

    const existingPlayers = games[gameId].players;
    const isPlayerInGame = existingPlayers.some((player) => player.userId === user.id);

    if (!isPlayerInGame) {
        const gameData = await fetchGame(gameId);
        if (!gameData) {
            socket.emit("error", { message: "Game data could not be fetched" });
            return;
        }

        console.log(`USERID: ${user.id}\nPlayer2Id: ${gameData.player2_id}\nPlayer1_Id: ${gameData.player1_id}`);

        // Initialize the game object if not already
        if (!games[gameId]) {
            games[gameId] = {
                players: [],
                squares: [...Array(9).fill(null)],
                xIsNext: true,
                // other game properties...
            };
        }

        // Assign players based on the user ID
        if (user.id === gameData.player1_id) {
            // 1 reconnecting
            playerSign = gameData.player1_sign;
            reconnecting = true;
        } else if (!gameData.player2_id) {
            // New 2player joins
            const player2Sign = gameData.player1_sign === "X" ? "O" : "X";
            playerSign = player2Sign;
            updateGameHistory(gameData.player1_id, user.id, null, gameData.player1_sign, gameId);
        } else if (user.id === gameData.player2_id) {
            //  2 reconnecting
            playerSign = gameData.player1_sign === "X" ? "O" : "X";
            reconnecting = true;
        } else {
            socket.emit("error", { message: "You cannot join this lobby" });
            return;
        }

        // Push the player to the game's player list
        games[gameId].players.push({
            id: socket.id,
            sign: playerSign,
            userId: user.id
        });

        // Handle starting the game if two players are connected
        if (games[roomId].players.length === 2) {
            console.log("Current game for the ID:\n", games[gameId]);
            socket.emit("joinedRoom");

            changeAndUpdateGameStatus(activeGameStatus, gameId);
            games[gameId].players.forEach((player) => {
                io.to(player.id).emit("startGame", {
                    squares: games[gameId].squares,
                    xIsNext: games[gameId].xIsNext,
                    sign: player.sign,
                });
            });
            if(reconnecting){
              io.to(games[roomId].players[0].id).emit('notification', { message: 'Opponente reconnected!'});
            }
        }
    } else {
        socket.emit("error", { message: "You are already in the lobby" });
    }
});

    

    socket.on("makeMove", async ({ roomId, squareIndex }) => {
      const game = games[roomId];
      
      // Check if the game exists and is not finished
      if (!game || game.status === finishedGameStatus) {
        console.error("Game is either finished or does not exist.");
        return;
      }
      
      // Check if the square is already filled
      if (game.squares[squareIndex]) {
        console.error("Square is already filled.");
        return;
      }
    
      // Ensure the current player is making the move
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
      
      // Update the game state
      game.squares[squareIndex] = currentPlayerSign;
      game.xIsNext = !game.xIsNext;
      
      console.log(
        `Move made in room ${roomId} at index ${squareIndex} by ${currentPlayerSign}`
      );
      
      // Check if there's a winner
      const winner = calculateWinner(game.squares);
      
      if (winner) {
        game.players.forEach((player) => {
          io.to(player.id).emit("gameOver", { winner, squares: game.squares });
        });
        games[roomId].winner = winner;
        // Change the status and update the DB
        await changeAndUpdateGameStatus(finishedGameStatus, roomId);
        
        const player1 = games[roomId].players[0];
        const result = calculateResult(winner, player1.sign);
        
        // Update game history and insert move
        await Promise.all([
          updateResultGameHistory(result, roomId),
          insertMove(roomId, player.userId, squareIndex)
        ]);
        
      } else {
        // No winner, just emit moveMade event
        game.players.forEach((player) => {
          io.to(player.id).emit("moveMade", {
            squares: game.squares,
            xIsNext: game.xIsNext,
          });
        });
        
        // Insert the move into the database
        await insertMove(roomId, player.userId, squareIndex);
      }
    });
    

    // SinglePlayer
    socket.on("playWithBot", ({ squares }) => {
      console.log("BOTGAME");
      const winner = calculateWinner(squares);
      if (winner) {
        socket.emit("gameOver", { winner, squares });
      } else {
        const botMove = makeRandomMove(squares);
        squares[botMove] = "O";
        const winner = calculateWinner(squares);
        socket.emit("moveMade", { squares, xIsNext: true });
        if (winner) {
          socket.emit("gameOver", { winner, squares });
        }
      }
    });

    socket.on("leaveRoom", ({ gameId }) => {
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
          changeAndUpdateGameStatus(abortedGameStatus, gameId);
          delete games[gameId]; 
          console.log(`Game ${gameId} deleted due to no players remaining`);
          
        } else {
          const remainingPlayer = game.players[0];
          
          // Inform 
          if (remainingPlayer) {
            io.to(remainingPlayer.id).emit("error", {
              message: "Your opponent has left the game."
            });
            changeAndUpdateGameStatus(pendingGameStatus, gameId); 
          } else {
            console.error("No remaining player to notify.");
          }
        }
        
      } else {
        console.error(`Player ${socket.id} not found in game ${gameId}`);
      }
    });
    

    socket.on("disconnect", () => {
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
        changeAndUpdateGameStatus(abortedGameStatus, foundGame);
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
            changeAndUpdateGameStatus(pendingGameStatus, foundGame); 
          } else {
            console.error("No remaining player to notify.");
          }
        } else {
          console.log(`Game ${foundGame} already finished, no need to update status.`);
        }
      }
    });
  });

  // Random bot move
  function makeRandomMove(squares) {
    const availableMoves = squares
      .map((square, index) => (square === null ? index : null))
      .filter((index) => index !== null);

    const randomIndex = Math.floor(Math.random() * availableMoves.length);
    return availableMoves[randomIndex];
  }
  function calculateResult(winner, player1Sign) {
    if (winner === "draw") {
      return 0;
    }

    return winner === player1Sign ? 1 : 2;
  }

  function changeAndUpdateGameStatus(status, gameId) {
    const finishedOrAbortedStatuses = [finishedGameStatus, abortedGameStatus];
  
    
    if (games[gameId] && !finishedOrAbortedStatuses.includes(games[gameId].status)) {
     
      games[gameId].status = status;
  
      games[gameId].players.forEach(player => {

        io.to(player.id).emit('changeStatus', { status: status });
      
      });
  
      
      updateGameStatus(gameId, status);
    }
  }
  
  function calculateWinner(squares) {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ];

    // Check winner
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (
        squares[a] &&
        squares[a] === squares[b] &&
        squares[a] === squares[c]
      ) {
        return squares[a]; //(X or O)
      }
    }

    // Check for draw
    if (!squares.includes(null)) {
      return "draw";
    }

    return null;
  }
}

module.exports = initSocketIO;
