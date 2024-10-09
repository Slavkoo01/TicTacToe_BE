const { validateCreateUser } = require('../validation/userValidation');
const generateJWToken = require('../Token/generateJWToken');
const pool = require('../startup/db'); // Use pool instead of direct client
const bcrypt = require('bcrypt');

const saltRounds = 10;

module.exports = {
  Mutation: {
    registerUser: async (_, { username, email, password }) => {
      console.log("aa");
      const { error } = validateCreateUser({ username, email, password });
      if (error) {
        throw new Error(error.details[0].message);
      }

      const client = await pool.connect(); // Get client from pool
      try {
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
      } catch (error) {
        console.error('Error during registerUser mutation:', error);
        throw new Error(`${error}`);
      } finally {
        client.release(); 
      }
    },
    
    loginUser: async (_, { username, password }) => {
      const client = await pool.connect(); 
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
        throw new Error(`${error}`);
      } finally {
        client.release(); 
      }
    },
  },
};
