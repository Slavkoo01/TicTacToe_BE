const client = require('../startup/db');
const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = {
  Query: {
    getGamesByUsername: async (_, __, {  user }) => {
      if (!client) throw new Error('Database client is not defined');
      if (!user || !user.id) throw new Error('Unauthorized');

      // Fetch game history for the user
      const resultQuery = await client.query(`
          SELECT * FROM game_history
          WHERE player1_id = $1
          OR player2_id = $1
      `, [user.id]);

      const gameHistories = resultQuery.rows;

      // Fetch users and games based on the game history

      const gameHistoryWithDetails = await Promise.all(gameHistories.map(async (history) => {
          // Fetch player1 details
          const player1Query = await client.query(`
              SELECT * FROM users WHERE id = $1
          `, [history.player1_id]);
          const player1 = player1Query.rows[0];

          // Fetch player2 details
          const player2Query = await client.query(`
              SELECT * FROM users WHERE id = $1
          `, [history.player2_id]);
          const player2 = player2Query.rows[0];

          // Fetch game details
          const gameQuery = await client.query(`
              SELECT * FROM games WHERE id = $1
          `, [history.game_id]); 
          const game = gameQuery.rows[0];

          return {
              id: history.id,
              player1,      
              player2,     
              result: history.result,
              game,         
              gameDate: history.game_date,
          };
      }));

      return gameHistoryWithDetails;
  }


  },
  Mutation: {
    
    createGame: async (_, { type }, { user }) => {
      if (!user) throw new Error('Unauthorized');

      const result = await client.query(
        'INSERT INTO games (creator_id, type, status) VALUES ($1, $2, $3) RETURNING *',
        [user.id, type, 'pending'] 
      );

      return result.rows[0];
    },

    
    joinGame: async (_, { gameId }, { user }) => {
      if (!user) throw new Error('Unauthorized');

     
      const gameQuery = await client.query('SELECT * FROM games WHERE id = $1', [gameId]);

      if (gameQuery.rowCount === 0) {
        throw new Error('Game not found');
      }

      const game = gameQuery.rows[0];

      if (game.status !== 'pending') {
        throw new Error('Game is already in progress or completed');
      }

      // Update the game status to 'active' and set the opponent
      const result = await client.query(
        'UPDATE games SET status = $1, opponent_id = $2 WHERE id = $3 RETURNING *',
        ['active', user.id, gameId]
      );

      return result.rows[0];
    },

    // Record game history after the game ends
    recordGameHistory: async (_, { gameId, player1Id, player2Id, result }, { user }) => {
      if (!user) throw new Error('Unauthorized');

     
      const resultQuery = await client.query(
        `INSERT INTO game_history (game_id, player1_id, player2_id, result) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [gameId, player1Id, player2Id, result]
      );

      
      await client.query('UPDATE games SET status = $1 WHERE id = $2', ['completed', gameId]);

      return resultQuery.rows[0];
    },

    
  }
};
