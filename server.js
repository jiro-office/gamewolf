const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public")); // index.html 配置

let players = {};
let roles = {};
let votes = {};

const ROLE_LIST = ["wolf", "seer", "villager"]; // 3人用

io.on("connection", socket => {
  players[socket.id] = socket;

  socket.on("start", () => {
    const ids = Object.keys(players);
    const shuffled = ROLE_LIST.sort(() => Math.random() - 0.5);

    ids.forEach((id, i) => {
      roles[id] = shuffled[i];
      players[id].emit("role", roles[id]);
    });

    io.emit("phase", "day");
  });

  socket.on("chat", msg => {
    io.emit("chat", { id: socket.id, msg });
  });

  socket.on("vote", target => {
    votes[socket.id] = target;

    if (Object.keys(votes).length === Object.keys(players).length) {
      let count = {};
      for (const t of Object.values(votes)) count[t] = (count[t] || 0) + 1;
      let eliminated = Object.entries(count).sort((a,b)=>b[1]-a[1])[0][0];
      io.emit("result", eliminated);
      votes = {};
      io.emit("phase", "night");
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
