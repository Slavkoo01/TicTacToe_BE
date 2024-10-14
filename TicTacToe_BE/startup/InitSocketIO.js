const socketIO = require("socket.io");
const gameHandler = require('../Game/logic');

function initSocketIO(server) {
  const io = socketIO(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  const games = {};

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("createGame", async (data) => gameHandler.createGame(socket, data, games));
    socket.on("checkStatus", (data) => gameHandler.checkStatus(socket, data, games));
    socket.on("joinRoom", async (data) => gameHandler.joinRoom(socket, data, games, io));
    socket.on("makeMove", async (data) => gameHandler.makeMove(socket, data, games, io));
    socket.on("playWithBot", (data) => gameHandler.playWithBot(socket, data));
    socket.on("leaveRoom", (data) => gameHandler.leaveRoom(socket, data, games, io));
    socket.on("disconnect", () => gameHandler.handleDisconnect(socket, games, io));
    socket.on("checkInLobby", (data) => gameHandler.handleCheckInLobby(socket, data, games, io));
    socket.on("bussyLobby", (data) => gameHandler.handleBussyLobby(socket, data, games, io));
  });
}

module.exports = initSocketIO;
