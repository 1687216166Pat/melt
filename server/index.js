// server/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { initWebSocket } = require("./ws/socket");
const { initDB } = require("./db/index");
const apiRoutes = require("./routes/api");
const { consolidateMemories } = require("./services/memory");
const { checkProactiveMessages } = require("./services/proactive");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

initDB();

app.use(cors());
app.use(express.json());
app.use("/api", apiRoutes);

// 生产环境托管前端
const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));
app.get("/{*path}", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(distPath, "index.html"));
  }
});

initWebSocket(server);

setInterval(consolidateMemories, 6 * 60 * 60 * 1000);
setInterval(checkProactiveMessages, 30 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`服务运行在 http://localhost:${PORT}`);
});
