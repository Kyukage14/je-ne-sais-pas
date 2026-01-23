const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// ----------------------
// Serve static files
// ----------------------
app.use(express.static("public"));
app.use(cors());

// ----------------------
// High Scores in memory
// ----------------------
let highScores = [];

// ----------------------
// Socket.io logic
// ----------------------
io.on("connection", (socket) => {
    console.log("A user connected: " + socket.id);

    // Send current state (scores) to the new player
    socket.emit("state", { highScores });

    // Receive updates from clients
    socket.on("update", data => {
        if (!data.name || typeof data.score !== "number") return;

        const existing = highScores.find(item => item.name.toLowerCase() === data.name.toLowerCase());
        if (!existing || data.score > existing.score) {
            if (existing) existing.score = data.score;
            else highScores.push({ name: data.name, score: data.score });

            highScores.sort((a, b) => b.score - a.score);
            if (highScores.length > 10) highScores.pop();
        }

        // Broadcast updated scores to all players
        io.emit("state", { highScores });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected: " + socket.id);
    });
});

// ----------------------
// Start server
// ----------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
