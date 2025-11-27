// ===== server.js =====
const express = require("express");
const app = express();

// Render は PORT を自動で割り当てする
const PORT = process.env.PORT || 3000;

// サーバー開始
const server = app.listen(PORT, () => {
  console.log("server start on " + PORT);
});

// Socket.io
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  }
});

// 静的ファイル（index.html など）を配信
app.use(express.static("./"));

// データ保存
let players = {};
let roles = {};
let votes = {};

const ROLE_LIST = ["wolf", "seer", "villager"]; // 3人用

// 接続時
io.on("connection", socket => {
  console.log("connected:", socket.id);
  players[socket.id] = socket;

  // ゲーム開始（役職配布）
  socket.on("start", () => {
    const ids = Object.keys(players);
    const shuffled = ROLE_LIST.sort(() => Math.random() - 0.5);

    ids.forEach((id, i) => {
      roles[id] = shuffled[i];
      players[id].emit("role", roles[id]); // 個別に役職送信
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

    // 全員投票済み？
    if (Object.keys(votes).length === Object.keys(players).length) {
      let count = {};

      // 集計
      for (const t of Object.values(votes)) {
        count[t] = (count[t] || 0) + 1;
      }

      // 最多票
      const eliminated = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];

      io.emit("result", eliminated); // 処刑結果
      votes = {}; // 投票クリア

      io.emit("phase", "night"); // 夜へ
    }
  });

  // 切断
  socket.on("disconnect", () => {
    console.log("disconnected:", socket.id);
    delete players[socket.id];
    delete roles[socket.id];
    delete votes[socket.id];
  });
});
