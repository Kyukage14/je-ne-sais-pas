const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Etat global du jeu (pour tous les joueurs)
let gameState = {
  snake: [],   // Chaque joueur aura son propre serpent côté client
  scores: []   // Tableau des scores global pour tous les joueurs
};

io.on("connection", (socket) => {
  console.log("Un joueur connecté :", socket.id);

  // Envoyer l’état actuel à ce joueur
  socket.emit("state", gameState);

  // Quand un joueur envoie son score ou état
  socket.on("update", (playerState) => {
    // Mettre à jour le tableau des scores
    const existing = gameState.scores.find(p => p.id === socket.id);
    if (existing) {
      existing.score = playerState.score;
      existing.name = playerState.name;
    } else {
      gameState.scores.push({
        id: socket.id,
        name: playerState.name,
        score: playerState.score
      });
    }

    // Envoyer à tous les autres joueurs
    socket.broadcast.emit("state", gameState);
  });

  // Déconnexion
  socket.on("disconnect", () => {
    console.log("Joueur déconnecté :", socket.id);
    gameState.scores = gameState.scores.filter(p => p.id !== socket.id);
    socket.broadcast.emit("state", gameState);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Serveur démarré sur le port", PORT));
