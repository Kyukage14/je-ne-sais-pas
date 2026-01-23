const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let highScores = [];

io.on("connection", (socket) => {
  console.log("Un joueur connecté");

  // Envoyer les scores actuels au joueur qui vient de se connecter
  socket.emit("state", { highScores });

  // Quand un joueur envoie son score
  socket.on("update", ({ name, score }) => {
    const existing = highScores.find(item => item.name === name);
    if (!existing || score > existing.score) {
      if (existing) existing.score = score;
      else highScores.push({ name, score });
      highScores.sort((a,b) => b.score - a.score);
      if (highScores.length > 10) highScores.pop();
    }

    // Diffuser les scores à tous les joueurs
    io.emit("state", { highScores });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Serveur démarré sur port", PORT));
