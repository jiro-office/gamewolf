// ===== server.js =====
const express = require("express");
const app = express();
const server = app.listen(3000, () => console.log("server start"));
const io = require("socket.io")(server);

app.use(express.static("./")); // index.html を配信

let players = {};
let roles = {};
let votes = {};

const ROLE_LIST = ["wolf", "seer", "villager"]; // 3人用

// 接続
io.on("connection", socket => {
  players[socket.id] = socket;

  // 役職配布
  socket.on("start", () => {
    const ids = Object.keys(players);
    const shuffled = ROLE_LIST.sort(() => Math.random() - 0.5);

    ids.forEach((id, i) => {
      roles[id] = shuffled[i];
      players[id].emit("role", roles[id]); // 個別に役職を送る
    });

    io.emit("phase", "day"); // 昼開始
  });

  // チャット
  socket.on("chat", msg => {
    io.emit("chat", { id: socket.id, msg });
  });

  // 投票
  socket.on("vote", target => {
    votes[socket.id] = target;

    // 全員投票した？
    if (Object.keys(votes).length === Object.keys(players).length) {
      // 集計
      let count = {};
      for (const t of Object.values(votes)) {
        count[t] = (count[t] || 0) + 1;
      }

      // 最多票
      let eliminated = Object.entries(count).sort((a,b)=>b[1]-a[1])[0][0];
      io.emit("result", eliminated);

      votes = {}; // 初期化
      io.emit("phase", "night");
    }
  });
});
