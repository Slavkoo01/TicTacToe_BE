const client = require('../startup/db');

module.exports = {
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
    }
  }
};
