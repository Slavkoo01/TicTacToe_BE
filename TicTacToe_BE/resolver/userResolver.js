
const { validateCreateUser } = require('../validation/userValidation');  
const client = require('../startup/db');
const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = {
  Query: {
    getUser: async (_, { id }) => {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0];
    },
    getAllUsers: async () => {
      const result = await client.query('SELECT * FROM users');
      return result.rows;
    },
  },
  Mutation: {
    createUser: async (_, { username, email, password }) => {
      
      const { error } = validateCreateUser({ username, email, password });
      if (error) {
        throw new Error(error.details[0].message);
      }

      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      const result = await client.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
        [username, email, hashedPassword]
      );

      return result.rows[0];
    },
  },
};