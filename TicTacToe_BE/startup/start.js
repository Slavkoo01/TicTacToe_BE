const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http');

const startApolloServer = require('./apolloServer');
const initSocketIO = require('./InitSocketIO'); 

app.use(cors());

async function startServer() {
try{

  const server = http.createServer(app);
  
  await startApolloServer(app); 
  
  initSocketIO(server); 
  
  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}...`);
  });
} catch (error){
  console.error('Error starting the server:', error);
}
}

module.exports = startServer;
