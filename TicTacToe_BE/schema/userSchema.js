const { gql } = require('apollo-server-express');

module.exports = gql`
  type User {
    id: ID!
    username: String!
    email: String!
  }
  type AuthPayload {
    token: String!
  }

  type Query {
    getUser(id: ID!): User
    getAllUsers: [User]
  }
    
  type Mutation {
      registerUser(username: String!, email: String!, password: String!): User
      loginUser(username: String!, password:String!): AuthPayload
  }
`;