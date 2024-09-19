const client = require('../startup/db');

module.exports = {
  Mutation: {
    createGame: async (_, { type }, { user }) => {
        if (!user) throw new Error('Unauthorized');
        
        const result = await client.query(
            'INSERT INTO games (creator_id, type, status) VALUES ($1, $2, $3) RETURNING *',
            [user.id, type, 'active']
        );
      
      return result.rows[0];
    },

    joinGame: async (_, { gameId }, { user }) => {
      if (!user) throw new Error('Unauthorized');

      const result = await client.query(
        'UPDATE games SET status = $1 WHERE id = $2 RETURNING *',
        ['active', gameId]
      );
      
      if (result.rowCount === 0) throw new Error('Game not found');
      return result.rows[0];
    },
  },
};
