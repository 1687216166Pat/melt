// server/index.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const { initWebSocket } = require("./ws/socket");
const { initDB } = require("./db/index");
const apiRoutes = require("./routes/api");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const PORT = 3001;

// 初始化数据库
initDB();

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use("/api", apiRoutes);

// 启动 WebSocket
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`服务运行在 http://localhost:${PORT}`);
});
