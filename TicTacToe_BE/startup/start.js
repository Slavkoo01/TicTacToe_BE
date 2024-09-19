const { ApolloServer } = require('apollo-server-express');
const { mergeTypeDefs, mergeResolvers } = require('@graphql-tools/merge');

const userSchema = require('../schema/userSchema');
const gameSchema = require('../schema/gameSchema');
const userResolver = require('../resolver/userResolver');
const gameResolver = require('../resolver/gameResolver');
const createContext = require('./contextApollo');

const typeDefs = mergeTypeDefs([userSchema, gameSchema]);
const resolvers = mergeResolvers([userResolver, gameResolver]);

const server = new ApolloServer({
    typeDefs: typeDefs,
    resolvers: resolvers,
    context: createContext,
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