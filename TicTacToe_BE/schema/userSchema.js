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
    type Mutation {
      registerUser(username: String!, email: String!, password: String!): AuthPayload
      loginUser(username: String!, password:String!): AuthPayload
  }
`;