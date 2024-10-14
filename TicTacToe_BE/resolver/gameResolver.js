const pool = require("../startup/db");
const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = {
  Query: {
    getGamesByUsername: async (_, __, { user }) => {
      if (!pool) throw new Error("Database client is not defined");
      if (!user || !user.id) throw new Error("Unauthorized");

      const client = await pool.connect();
      try {
        // Fetch game history for the user
        const resultQuery = await client.query(
          `
          SELECT *
          FROM game_history
          WHERE (player1_id = $1 OR player2_id = $1)
          AND result IS NOT NULL
          ORDER BY id ASC;


        `,
          [user.id]
        );

        const gameHistories = resultQuery.rows;

        const gameHistoryWithDetails = await Promise.all(
          gameHistories.map(async (history) => {
            // Fetch player1 details
            const player1Query = await client.query(
              `
            SELECT * FROM users WHERE id = $1
          `,
              [history.player1_id]
            );
            const player1 = player1Query.rows[0];
            // Fetch player2 details
            const player2Query = await client.query(
              `
            SELECT * FROM users WHERE id = $1
          `,
              [history.player2_id]
            );
            const player2 = player2Query.rows[0];

            // Fetch game details
            const gameQuery = await client.query(
              `
            SELECT * FROM games WHERE id = $1
          `,
              [history.gameid]
            );
            const game = gameQuery.rows[0];
            return {
              id: history.id,
              player1,
              player2,
              result: history.result,
              game,
              gameDate: history.game_date,
              player1_sign: history.player1_sign
            };
          })
        );

        return gameHistoryWithDetails;
      } catch (error) {
        console.error("Error fetching game history:", error);
        throw new Error(`Failed to fetch game history ${error}`);
      } finally {
        client.release();
      }
    },
    getMovesByGameId: async (_, { gameId }, { user }) => {
      if (!pool) throw new Error("Database client is not defined");
      if (!user || !user.id) throw new Error("Unauthorized");

      const client = await pool.connect();
      try {
        // Fetch moves for the specified game
        const movesQuery = await client.query(
          `
          SELECT * 
          FROM moves 
          WHERE game_id = $1 
          ORDER BY id ASC;  -- Assuming you want to order moves by their ID
          `,
          [gameId]
        );

        // If no moves found, you can return an empty array
        return movesQuery.rows.map(move => ({
          id: move.id,
          game_id: move.game_id,
          move_position: move.move_position,
          player_id: move.player_id,
        }));
      } catch (error) {
        console.error("Error fetching moves:", error);
        throw new Error(`Failed to fetch moves: ${error.message}`);
      } finally {
        client.release();
      }
    }
  }
};
