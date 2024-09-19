const jwt = require('jsonwebtoken');
const config = require('config');

const auth = (req) => {
  const token = req.headers['x-auth-token'];

  if (!token) {
    throw new Error('Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
    return { user: decoded };
  } catch (err) {
    throw new Error('Invalid token.');
  }
};

module.exports = auth;