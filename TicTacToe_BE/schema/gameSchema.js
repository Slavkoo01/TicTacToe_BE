const { gql } = require('apollo-server-express');

module.exports = gql`
  type Query {
    gameHistory(gameId: ID!): [GameHistory]
    userGameHistory(userId: ID!): [GameHistory]
    getGamesByUsername: [GameHistory!]!
    getMovesByGameId(gameId: ID!): [Move!]!  # New query to get moves by game ID
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
    moves: [Move!]!  # Added moves field
  }

  type GameHistory {
    id: ID!
    player1: User
    player2: User
    result: Int!  # 0 for draw, 1 for player1 win, 2 for player2 win
    game: Game
    gameDate: String
    player1_sign: String
  }

  type Move {
    id: ID!
    game_id: ID!
    move_position: Int!
    player_id: ID!

  }
`;
