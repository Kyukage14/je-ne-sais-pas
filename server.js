const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let gameState = {
  snake: [{ x: 10, y: 10 }],
  food: { x: 5, y: 5 },
  score: 0,
  superMode: false
};

io.on("connection", (socket) => {
  console.log("Un joueur connecté");

  socket.emit("state", gameState);

  socket.on("update", (state) => {
    gameState = state;
    socket.broadcast.emit("state", gameState);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Serveur démarré sur port", PORT));
