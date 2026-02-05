const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("public"));
app.use(cors());

// ----------------------
// Fichiers de stockage
// ----------------------
const SCORES_FILE = path.join(__dirname, "scores.json");
const FRIENDS_FILE = path.join(__dirname, "friends.json");
const REQUESTS_FILE = path.join(__dirname, "friendRequests.json");

// ----------------------
let highScores = fs.existsSync(SCORES_FILE) ? JSON.parse(fs.readFileSync(SCORES_FILE)) : [];
let friends = fs.existsSync(FRIENDS_FILE) ? JSON.parse(fs.readFileSync(FRIENDS_FILE)) : {};
let friendRequests = fs.existsSync(REQUESTS_FILE) ? JSON.parse(fs.readFileSync(REQUESTS_FILE)) : {};
let connectedUsers = {};

// ----------------------
function saveScores() {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(highScores, null, 2));
}
function saveFriends() {
  fs.writeFileSync(FRIENDS_FILE, JSON.stringify(friends, null, 2));
}
function saveFriendRequests() {
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(friendRequests, null, 2));
}

// ----------------------
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 🔹 REGISTER
  socket.on("register", (playerName) => {
    connectedUsers[socket.id] = playerName;

    if (!friendRequests[playerName]) friendRequests[playerName] = [];
    if (!friends[playerName]) friends[playerName] = [];

    socket.emit("friendsList", friends[playerName]);
    socket.emit("friendRequests", friendRequests[playerName]);
    socket.emit("state", { highScores });
  });

  // 🔹 SCORE
  socket.on("update", ({ name, score }) => {
    if (!name || typeof score !== "number") return;

    const existing = highScores.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (!existing || score > existing.score) {
      if (existing) existing.score = score;
      else highScores.push({ name, score });

      highScores.sort((a, b) => b.score - a.score);
      if (highScores.length > 10) highScores.pop();
      saveScores();
    }

    io.emit("state", { highScores });
  });

  // 🔹 SEARCH
  socket.on("searchPlayer", (text) => {
    const results = Object.values(connectedUsers)
      .filter(name => name.toLowerCase().startsWith(text.toLowerCase()))
      .slice(0, 5);

    socket.emit("searchResults", results);
  });

  // 🔹 SEND FRIEND REQUEST
  socket.on("sendFriendRequest", ({ from, to }) => {
    if (!friendRequests[to]) friendRequests[to] = [];
    if (!friendRequests[to].includes(from)) {
      friendRequests[to].push(from);
      saveFriendRequests();
    }

    const targetSocketId = Object.keys(connectedUsers).find(id => connectedUsers[id] === to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("friendRequests", friendRequests[to]);
    }
  });

  // 🔹 ACCEPT FRIEND
  socket.on("acceptFriend", ({ from, to }) => {
    if (!friends[from]) friends[from] = [];
    if (!friends[to]) friends[to] = [];

    if (!friends[from].includes(to)) friends[from].push(to);
    if (!friends[to].includes(from)) friends[to].push(from);

    friendRequests[to] = (friendRequests[to] || []).filter(name => name !== from);

    saveFriends();
    saveFriendRequests();

    Object.entries(connectedUsers).forEach(([id, name]) => {
      if (name === from || name === to) {
        io.to(id).emit("friendsList", friends[name]);
        io.to(id).emit("friendRequests", friendRequests[name] || []);
      }
    });
  });

  // 🔹 REMOVE FRIEND ✅ (AU BON ENDROIT)
  socket.on("removeFriend", ({ from, to }) => {
    if (friends[from]) friends[from] = friends[from].filter(f => f !== to);
    if (friends[to]) friends[to] = friends[to].filter(f => f !== from);

    saveFriends();

    Object.entries(connectedUsers).forEach(([id, name]) => {
      if (name === from || name === to) {
        io.to(id).emit("friendsList", friends[name] || []);
      }
    });
  });

  // 🔹 DISCONNECT
  socket.on("disconnect", () => {
    delete connectedUsers[socket.id];
  });
});

// ----------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
