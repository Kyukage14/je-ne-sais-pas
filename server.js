const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Serve les fichiers front-end depuis le dossier /public
app.use(express.static(path.join(__dirname, "public")));

// Scores globaux
let globalHighScores = [];

// WebSocket
io.on("connection", (socket) => {
    console.log("Nouveau joueur connecté :", socket.id);

    // Envoyer les scores globaux au joueur qui vient de se connecter
    socket.emit("state", { highScores: globalHighScores });

    // Quand un joueur envoie ses scores
    socket.on("update", (data) => {
        if (data.highScores) {
            globalHighScores = data.highScores
                .sort((a, b) => b.score - a.score)
                .slice(0, 10); // garder seulement le top 10
        }

        // Envoyer les scores mis à jour à tous les joueurs
        io.emit("state", { highScores: globalHighScores });
    });

    socket.on("disconnect", () => {
        console.log("Joueur déconnecté :", socket.id);
    });
});

// Démarrage du serveur
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Serveur Snake WebSocket lancé sur le port ${PORT}`);
});
