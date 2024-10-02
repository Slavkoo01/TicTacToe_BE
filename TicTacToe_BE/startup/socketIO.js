const socketIO = require('socket.io');

function initSocketIO(server) {
  const io = socketIO(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
    }
  });
  
  const games = {};

  io.on('connection', (socket) => {
    //console.log('A user connected:', socket.id);
    
    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);

      // Initialize game if not present
      if (!games[roomId]) {
        games[roomId] = {
          squares: Array(9).fill(null),
          xIsNext: true,
          players: [],
        };
      }

      games[roomId].players.push(socket.id);
      //start game if players present
      if (games[roomId].players.length === 2) {
        io.in(roomId).emit('startGame', {
          squares: games[roomId].squares,
          xIsNext: games[roomId].xIsNext,
        });
      }
    });

    // moves by player
    socket.on('makeMove', ({ roomId, squareIndex }) => {
      const game = games[roomId];
      if (!game || game.squares[squareIndex]) return;

      const currentPlayer = game.xIsNext ? 'X' : 'O';
      game.squares[squareIndex] = currentPlayer;
      game.xIsNext = !game.xIsNext;

      // Winner
      const winner = calculateWinner(game.squares);
      if (winner) {
        io.in(roomId).emit('gameOver', { winner, squares: game.squares });
      } else {
        io.in(roomId).emit('moveMade', {
          squares: game.squares,
          xIsNext: game.xIsNext,
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

  // Calculate winner
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
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  }
}

module.exports = initSocketIO;
