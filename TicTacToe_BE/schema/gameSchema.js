const { gql } = require('apollo-server-express');

module.exports = gql`
  type Mutation {
    createGame(type: GameType!): Game
    joinGame(gameId: ID!): Game
    recordGameHistory(gameId: ID!, player1Id: ID!, player2Id: ID!, result: Int!): GameHistory
  }

  type Query {
    gameHistory(gameId: ID!): [GameHistory]
    userGameHistory(userId: ID!): [GameHistory]
    getGamesByUsername: [GameHistory!]!
  }

  enum GameType {
    MULTIPLAYER
    SINGLEPLAYER
  }

  type Game {
    id: ID!
    creator: User
    type: GameType!
    status: String!
    created_at: String
  }

  type GameHistory {
    id: ID!
    player1: User
    player2: User
    result: Int! # 0 for draw, 1 for player1 win, 2 for player2 win
    game: Game
    gameDate: String
  }

 
`;
