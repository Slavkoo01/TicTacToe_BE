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

async function startApolloServer(app) {
  await server.start(); 
  
  server.applyMiddleware({ app, path: '/TicTacToe' }); 
}

module.exports = startApolloServer;
