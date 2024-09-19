const jwt = require('jsonwebtoken');
const config = require('config');

const generateJWToken = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email
    };

    const token = jwt.sign(payload, config.get('jwtPrivateKey'));

    return token;
};

module.exports = generateJWToken;