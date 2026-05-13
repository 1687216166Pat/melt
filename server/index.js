// server/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { initWebSocket } = require("./ws/socket");
const { initDB } = require("./db/index");
const apiRoutes = require("./routes/api");
const { consolidateMemories } = require("./services/memory");
const { checkProactiveMessages } = require("./services/proactive");

const app = express();
const server = http.createServer(app);
const PORT = 3001;

initDB();

app.use(cors());
app.use(express.json());
app.use("/api", apiRoutes);

initWebSocket(server);

// 每 6 小时合并记忆
setInterval(consolidateMemories, 6 * 60 * 60 * 1000);

// 每 30 分钟检查一次是否需要发主动消息
setInterval(checkProactiveMessages, 30 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`服务运行在 http://localhost:${PORT}`);
});
