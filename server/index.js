require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { initWebSocket } = require("./ws/socket");
const { initDB } = require("./db/index");
const apiRoutes = require("./routes/api");
const { consolidateMemories, initCounters } = require("./services/memory");
const { checkProactiveMessages } = require("./services/proactive");
const { getPersonaList } = require("./services/prompt");
const { checkScheduledMessages } = require("./services/scheduler");
const { runDailySediment, runWeeklyInsight } = require("./services/sediment");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

initDB();
setTimeout(initCounters, 2000);

// 每 30 秒检查一次定时消息
setInterval(checkScheduledMessages, 30 * 1000);

// 启动时从数据库加载 API 配置
setTimeout(async () => {
  try {
    const { getDB } = require("./db/index");
    const db = getDB();

    // 加载主 API 配置
    const { data } = await db
      .from("user_profile")
      .select("key, value")
      .in("key", ["api_key", "api_base_url", "api_model"]);
    if (data) {
      data.forEach((row) => {
        if (row.key === "api_key" && row.value)
          process.env.AI_API_KEY = row.value;
        if (row.key === "api_base_url" && row.value)
          process.env.AI_BASE_URL = row.value;
        if (row.key === "api_model" && row.value) {
          process.env.AI_MODEL = row.value;
          process.env.AI_MEMORY_MODEL = row.value;
        }
      });
      console.log("已从数据库加载 API 配置, 模型:", process.env.AI_MODEL);
    }

    // 加载副 API 配置
    const { data: subData } = await db
      .from("user_profile")
      .select("key, value")
      .in("key", ["sub_api_key", "sub_api_base_url", "sub_api_model"]);
    if (subData) {
      subData.forEach((row) => {
        if (row.key === "sub_api_key" && row.value)
          process.env.AI_SUB_API_KEY = row.value;
        if (row.key === "sub_api_base_url" && row.value)
          process.env.AI_SUB_BASE_URL = row.value;
        if (row.key === "sub_api_model" && row.value)
          process.env.AI_SUB_MODEL = row.value;
      });
      console.log("已从数据库加载副 API 配置, 模型:", process.env.AI_SUB_MODEL);
    }
  } catch (e) {
    console.error("加载 API 配置失败:", e);
  }
}, 1000);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use("/api", apiRoutes);

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

// 零点触发每日沉淀
setInterval(() => {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }),
  );
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    const personas = getPersonaList();
    const { dailyConsolidate } = require("./services/memory");
    personas.forEach((p) => dailyConsolidate(p.id));
    console.log("[记忆] 零点沉淀已触发");
  }
}, 60000);

setInterval(checkProactiveMessages, 30 * 60 * 1000);

// 每分钟检查是否到零点（触发每日总结）
setInterval(() => {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }),
  );
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    runDailySediment();
    if (now.getDay() === 0) runWeeklyInsight();
  }
}, 60000);

server.listen(PORT, () => {
  console.log(`服务运行在 http://localhost:${PORT}`);
});
