const { gql } = require('apollo-server-express');

module.exports = gql`
type Mutation {
    createGame(type: String!): Game
    joinGame(gameId: ID!): Game
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
}`;