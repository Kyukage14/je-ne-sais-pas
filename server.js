const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static("public"));
app.use(cors());

/* ===============================
   DONNÉES SERVEUR (mémoire)
=============================== */

let highScores = [];
let connectedUsers = {};      // socket.id -> pseudo
let friendRequests = {};      // pseudo -> [demandes]
let friends = {};             // pseudo -> [amis]

/* ===============================
   CONNEXION JOUEUR
=============================== */
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("register", (playerName) => {
        connectedUsers[socket.id] = playerName;
        console.log(playerName, "est en ligne");

        if (!friendRequests[playerName]) friendRequests[playerName] = [];
        if (!friends[playerName]) friends[playerName] = [];

        socket.emit("friendsList", friends[playerName]);
        socket.emit("friendRequests", friendRequests[playerName]);
    });

    /* ===============================
       SCORES
    =============================== */
    socket.emit("state", { highScores });

    socket.on("update", data => {
        if (!data.name || typeof data.score !== "number") return;

        const existing = highScores.find(item => item.name.toLowerCase() === data.name.toLowerCase());
        if (!existing || data.score > existing.score) {
            if (existing) existing.score = data.score;
            else highScores.push({ name: data.name, score: data.score });

            highScores.sort((a, b) => b.score - a.score);
            if (highScores.length > 10) highScores.pop();
        }

        io.emit("state", { highScores });
    });

    /* ===============================
       RECHERCHE JOUEUR
    =============================== */
    socket.on("searchPlayer", (text) => {
        const results = highScores
            .filter(p => p.name.toLowerCase().startsWith(text.toLowerCase()))
            .slice(0, 5);
        socket.emit("searchResults", results);
    });

    /* ===============================
       DEMANDE D'AMI
    =============================== */
    socket.on("sendFriendRequest", ({ from, to }) => {
        if (!friendRequests[to]) friendRequests[to] = [];
        if (!friendRequests[to].includes(from)) {
            friendRequests[to].push(from);
        }

        // Si le joueur est en ligne → notif instantanée
        const targetSocket = Object.keys(connectedUsers).find(id => connectedUsers[id] === to);
        if (targetSocket) {
            io.to(targetSocket).emit("friendRequests", friendRequests[to]);
        }
    });

    /* ===============================
       ACCEPTER AMI
    =============================== */
    socket.on("acceptFriend", ({ from, to }) => {
        if (!friends[from]) friends[from] = [];
        if (!friends[to]) friends[to] = [];

        friends[from].push(to);
        friends[to].push(from);

        friendRequests[to] = friendRequests[to].filter(name => name !== from);

        // Mettre à jour les deux joueurs s'ils sont en ligne
        Object.entries(connectedUsers).forEach(([id, name]) => {
            if (name === from || name === to) {
                io.to(id).emit("friendsList", friends[name]);
                io.to(id).emit("friendRequests", friendRequests[name] || []);
            }
        });
    });

    /* ===============================
       DÉCONNEXION
    =============================== */
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        delete connectedUsers[socket.id];
    });
});

/* ===============================
   START SERVER
=============================== */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on port", PORT));
