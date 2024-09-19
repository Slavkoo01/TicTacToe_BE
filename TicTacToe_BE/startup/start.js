const { ApolloServer } = require('apollo-server-express');


const userTypeDefs = require('../schema/userSchema');
const userResolvers = require('../resolver/userResolver');


const server = new ApolloServer({
    typeDefs: userTypeDefs,
    resolvers: userResolvers,
});


async function startServer(app) {
    await server.start();
  
    server.applyMiddleware({ app, path: '/TicTacToe' });
  
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Server is running at port ${PORT}...`);
    });
   
  }

  module.exports = startServer;