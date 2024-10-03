const jwt = require('jsonwebtoken');
const config = require('config');


const getTokenFromHeaders = (req) => {
  return req.headers['x-auth-token'];
};


const verifyToken = (token) => {
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


const auth = (req) => {
  const token = getTokenFromHeaders(req);
  return verifyToken(token);
};

module.exports = {
  getTokenFromHeaders,
  verifyToken,
  auth,
};
