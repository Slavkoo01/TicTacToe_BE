
const { validateCreateUser } = require('../validation/userValidation');  
const generateJWToken = require('../Token/generateJWToken');
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
    registerUser: async (_, { username, email, password }) => {
      const { error } = validateCreateUser({ username, email, password });
      if (error) {
        throw new Error(error.details[0].message);
      }

      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      const result = await client.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
        [username, email, hashedPassword]
      );

      const newUser = result.rows[0];

    
      const token = generateJWToken(newUser);

    
      return {
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
        },
      };
    },
    loginUser: async (_, { username, password }) => {
      try {
        const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) {
          throw new Error('Invalid username or password');
        }
    
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          throw new Error('Invalid username or password');
        }
    
        const token = generateJWToken(user);
        return {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        };
      } catch (error) {
        console.error('Error during loginUser mutation:', error);
        throw new Error('An error occurred while logging in. Please try again later.');
      }
    },
    
  },
};