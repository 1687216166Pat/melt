// server/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { initWebSocket } = require("./ws/socket");
const { initDB } = require("./db/index");
const apiRoutes = require("./routes/api");
const { consolidateMemories } = require("./services/memory");
const { checkProactiveMessages } = require("./services/proactive");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

initDB();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'https://gpt1-gilt-three.vercel.app/',
    'https://你的自定义域名'
  ],
  credentials: true
}))

app.use(express.json());
app.use("/api", apiRoutes);

// 只在 dist 目录存在时托管前端（本地开发或一体部署时）
const distPath = path.join(__dirname, "../dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(distPath, "index.html"));
    } else {
      next();
    }
  });
}

initWebSocket(server);

setInterval(consolidateMemories, 6 * 60 * 60 * 1000);
setInterval(checkProactiveMessages, 30 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`服务运行在 http://localhost:${PORT}`);
});
