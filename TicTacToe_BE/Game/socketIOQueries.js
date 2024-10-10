const pool = require("../startup/db");

async function insertNewGame(creatorId, gameType, gameStatus) {
  const query = `
      INSERT INTO games (creator_id, type, status)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
  const values = [creatorId, gameType, gameStatus];

  let client;
  try {
    // Acquire a client from the pool
    client = await pool.connect();

    const res = await client.query(query, values);
    console.log("New game created with ID:", res.rows[0].id);
    return res.rows[0].id;
  } catch (err) {
    console.error("Error inserting new game:", err);
  } finally {
    // Release the client back to the pool
    if (client) client.release();
  }
}

async function updateGameStatus(gameId, newStatus) {
  const query = `
      UPDATE games
      SET status = $1
      WHERE id = $2
      RETURNING *;
    `;
  const values = [newStatus, gameId];

  let client;
  try {
    client = await pool.connect();

    const res = await client.query(query, values);
    if (res.rowCount === 0) {
      console.error("Game not found");
    }
    console.log("Game status updated:", res.rows[0]);
    return res.rows[0];
  } catch (err) {
    console.error("Error updating game status:", err);
  } finally {
    if (client) client.release();
  }
}

async function insertGameHistory(
  player1Id,
  player2Id,
  result,
  player1Sign,
  game_id
) {
  const query = `
      INSERT INTO game_history (player1_id, player2_id, result, game_date, player1_sign, gameid)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
      RETURNING id;
    `;

  const values = [player1Id, player2Id, result, player1Sign, game_id];
  let client;
  try {
    client = await pool.connect();
    const res = await client.query(query, values);
    console.log("New game history entry created with ID:", res.rows[0].id);
    return res.rows[0].id;
  } catch (err) {
    console.error("Error inserting game history:", err);
  } finally {
    if (client) client.release();
  }
}
async function updateResultGameHistory(result, game_id) {
  const query = `
        UPDATE game_history
        SET result = $1
        WHERE gameid = $2
        RETURNING id;
      `;

  const values = [result, game_id];
  console.log("result: ", result);
  let client;
  try {
    client = await pool.connect();
    const res = await client.query(query, values);

    if (res.rowCount === 0) {
      console.error(
        "No game history entry found for the given game_id:",
        game_id
      );
      return null;
    }

    console.log("Game history updated for game ID:", game_id);
    return res.rows[0].id;
  } catch (err) {
    console.error("Error updating game history:", err);
  } finally {
    // Release the client back to the pool
    if (client) client.release();
  }
}
async function updateGameHistory(
  player1Id,
  player2Id,
  result,
  player1Sign,
  game_id
) {
  const query = `
        UPDATE game_history
        SET player1_id = $1,
            player2_id = $2,
            result = $3,
            player1_sign = $4,
            game_date = CURRENT_TIMESTAMP
        WHERE gameid = $5
        RETURNING id;
      `;

  const values = [player1Id, player2Id, result, player1Sign, game_id];
  let client;
  try {
    client = await pool.connect();

    const res = await client.query(query, values);

    if (res.rowCount === 0) {
      console.error(
        "No game history entry found for the given game_id:",
        game_id
      );
      return null;
    }

    console.log("Game history updated for game ID:", res.rows[0].id);
    return res.rows[0].id;
  } catch (err) {
    console.error("Error updating game history:", err);
  } finally {
    // Release the client back to the pool
    if (client) client.release();
  }
}

async function insertMove(gameId, playerId, movePosition) {
  const query = `
        INSERT INTO moves (game_id, player_id, move_position, move_time)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING id;
      `;

  const values = [gameId, playerId, movePosition];
  let client;
  try {
    client = await pool.connect();
    const res = await client.query(query, values);
    console.log("New move entry created with ID:", res.rows[0].id);
    return res.rows[0].id;
  } catch (err) {
    console.error("Error inserting move:", err);
  } finally {
    // Release the client back to the pool
    if (client) client.release();
  }
}
async function fetchGame(gameId) {
  if (!gameId || isNaN(gameId) || gameId <= 0) {
    console.error(`Invalid GameId: ${gameId};`);
    return;
  }
  const gameQuery = `
        SELECT 
          g.creator_id AS player1_id, 
          g.status
        FROM 
          games g
        WHERE 
          g.id = $1;
      `;

  const historyQuery = `
        SELECT 
          gh.player1_id,
          gh.player2_id, 
          gh.result, 
          gh.player1_sign
        FROM 
          game_history gh
        WHERE 
          gh.gameid = $1;
      `;

  const movesQuery = `
        SELECT 
          m.player_id, 
          m.move_position 
        FROM 
          moves m
        WHERE 
          m.game_id = $1
        ORDER BY 
          m.id ASC; 
          `;

  const values = [gameId];
  let client;
  try {
    client = await pool.connect();

    // Fetch game details
    const gameRes = await client.query(gameQuery, values);
    if (gameRes.rows.length === 0) {
      console.error("Game not found");
    }
    const gameData = gameRes.rows[0];

    // Fetch game history details
    const historyRes = await client.query(historyQuery, values);
    if (historyRes.rows.length === 0) {
      console.error("Game history not found");
    }
    const historyData = historyRes.rows[0];

    // Fetch moves
    const movesRes = await client.query(movesQuery, values);
    const moves = movesRes.rows;

    // Reconstruct game based on moves
    const board = Array(9).fill(null);
    const player2_sign = historyData.player1_sign === "X" ? "O" : "X";

    moves.forEach((move) => {
      board[move.move_position] =
        move.player_id === gameData.player1_id
          ? historyData.player1_sign
          : player2_sign;
    });

    console.log("GameRes: \n", gameData);
    console.log("GameHistory: \n", historyData);
    console.log("Board: \n", board);
    return {
      player1_id: gameData.player1_id,
      player2_id: historyData.player2_id,
      status: gameData.status,
      result: historyData.result,
      player1_sign: historyData.player1_sign,
      moves: moves,
      board: board
    };
  } catch (err) {
    console.error("Error fetching game:", err);
  } finally {
    // Release the client back to the pool
    if (client) client.release();
  }
}
module.exports = {
  insertNewGame,
  updateGameStatus,
  insertGameHistory,
  updateResultGameHistory,
  updateGameHistory,
  insertMove,
  fetchGame
};
