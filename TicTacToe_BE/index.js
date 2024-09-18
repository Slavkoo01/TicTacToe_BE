const express = require('express');
const app = express();
const userTypeDefs = require('./schema/userSchema');
const userResolvers = require('./resolver/userResolver');
const { graphqlHTTP } = require('express-graphql');
const { ApolloServer } = require('apollo-server-express');


require('./startup/config')();

const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 20;

const server = new ApolloServer({
    typeDefs: userTypeDefs,
    resolvers: userResolvers,
  });

  async function startServer() {

    await server.start();
  
    server.applyMiddleware({ app, path: '/TicTacToe' });
  
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Server is running at port ${PORT}...`);
    });
  }
  
  startServer();