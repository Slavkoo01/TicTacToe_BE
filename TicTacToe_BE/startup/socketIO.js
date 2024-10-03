const socketIO = require('socket.io');
const client = require('../startup/db');
const { verifyToken } = require('../middleware/auth');
const defaultGameStatus = 'pending';

function initSocketIO(server) {
  const io = socketIO(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
    }
  });

  const games = {};
  const connectedUsers = new Set();

  io.on('connection', (socket) => {

    if (connectedUsers.has(socket.id)) {
      socket.disconnect();
      return;
    }
    connectedUsers.add(socket.id);
    console.log('A user connected:', socket.id);

    socket.on('createGame', async ({ token, gameType }) => {
      try {
        const { user } = verifyToken(token);
        console.log('User authenticated:', user);
        const gameId = await insertNewGame(user.id, gameType, defaultGameStatus);
        console.log('Game Created Id:', gameId);
        socket.emit('gameCreated', { gameId });
      } catch (error) {
        console.error('Error during game creation:', error);
        socket.emit('error', { message: 'Failed to create game' });
      }
    });

    socket.on('joinRoom', (gameId) => {
      const roomId = gameId.gameId;
    

      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
    

      if (!games[roomId]) {
        games[roomId] = {
          roomId: roomId,
          squares: Array(9).fill(null),
          xIsNext: true,
          players: [],
        };
      }
    

      games[roomId].players.push(socket.id);
    
     
    

      if (games[roomId].players.length > 2) {
        console.log(`Room ${roomId} already has 2 players. Connection denied.`);
        socket.emit('error', { message: 'Room is full, cannot join.' });
        socket.leave(roomId); 
        return;
      }
    

      if (games[roomId].players.length === 2) {
        console.log(`Starting game for players: ${games[roomId].players}`);
        io.to(roomId).emit('startGame', {
          squares: games[roomId].squares,
          xIsNext: games[roomId].xIsNext,
        });
      }
      console.log(games);
    });
    
    
    socket.on('makeMove', ({ roomId, squareIndex }) => {
      const game = games[roomId];
    
      if (!game || game.squares[squareIndex]) {
        return; 
      }
    
      const currentPlayer = game.xIsNext ? 'X' : 'O';
      game.squares[squareIndex] = currentPlayer;
      game.xIsNext = !game.xIsNext;
    
      console.log(`Move made in room ${roomId} at index ${squareIndex} by ${currentPlayer}`);
    
      const winner = calculateWinner(game.squares);
      if (winner) {
        game.players.forEach(playerId => {
          io.to(playerId).emit('gameOver', { winner, squares: game.squares });
        });
      } else {
        game.players.forEach(playerId => {
          io.to(playerId).emit('moveMade', {
            squares: game.squares,
            xIsNext: game.xIsNext,
          });
        });
      }
    });
    
    // SinglePlayer
    socket.on('playWithBot', ({ squares }) => {
      const botMove = makeRandomMove(squares);
      squares[botMove] = 'O'; 
      const winner = calculateWinner(squares);
      if (winner) {
        socket.emit('gameOver', { winner, squares });
      } else {
        socket.emit('moveMade', { squares });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.id} disconnected`);
      connectedUsers.delete(socket.id); 
    });
  });

  // Random bot move
  function makeRandomMove(squares) {
    const availableMoves = squares
      .map((square, index) => (square === null ? index : null))
      .filter((index) => index !== null);

    const randomIndex = Math.floor(Math.random() * availableMoves.length);
    return availableMoves[randomIndex];
  }

  function calculateWinner(squares) {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    // Check winner
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a]; //(X or O)
      }
    }

    // Check for draw
    if (!squares.includes(null)) {
      return 'draw'; 
    }

    return null;
  }
}

async function insertNewGame(creatorId, gameType, gameStatus) {
  const query = `
    INSERT INTO games (creator_id, type, status)
    VALUES ($1, $2, $3)
    RETURNING id;
  `;

  const values = [
    creatorId,
    gameType, //  SINGLEPLAYER or MULTIPLAYER
    gameStatus, //  pending, active, or finished
  ];

  try {
    await client.connect(); 
    const res = await client.query(query, values); 
    console.log('New game created with ID:', res.rows[0].id);
    return res.rows[0].id; 
  } catch (err) {
    console.error('Error inserting new game:', err);
  } 
}

module.exports = initSocketIO;
