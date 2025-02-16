const { auth } = require('../middleware/auth');


const excludedOperations = ['GetUser', 'GetAllUsers', 'RegisterUser', 'LoginUser'];

const createContext = ({ req }) => {
    const operationName = req.body.operationName;
    console.log('Operation Name:', operationName);
    if (excludedOperations.includes(operationName) || !operationName) {
        return {}; 
    }

    return auth(req);
};

module.exports = createContext;