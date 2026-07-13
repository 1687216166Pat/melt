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
const { checkPersonaSchedules } = require("./services/scheduler_persona");

const APP_MODE = process.env.APP_MODE || "personal";
global.APP_MODE = APP_MODE;
console.log(`[模式] 当前运行: ${APP_MODE} 版`);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// 数据库只在 personal 模式初始化
if (APP_MODE === "personal") {
  initDB();
  setTimeout(initCounters, 2000);
}

// 定时任务只在 personal 模式运行
if (APP_MODE === "personal") {
  setInterval(() => {
    checkScheduledMessages().catch((e) =>
      console.error("[定时消息]", e.message),
    );
  }, 30 * 1000);

  setInterval(() => {
    checkPersonaSchedules().catch((e) =>
      console.error("[日程定时器]", e.message),
    );
  }, 60 * 1000);

  setInterval(checkProactiveMessages, 30 * 60 * 1000);

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

  setInterval(() => {
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }),
    );
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      runDailySediment();
      if (now.getDay() === 0) runWeeklyInsight();
    }
  }, 60000);

  console.log("[定时器] 定时消息和日程调度已启动");

  // 从数据库加载 API 配置
  setTimeout(async () => {
    try {
      const { getDB } = require("./db/index");
      const db = getDB();

      const { data } = await db
        .from("user_profile")
        .select("key, value")
        .in("key", ["api_key", "api_base_url", "api_model"]);
      if (data) {
        data.forEach((row) => {
          if (
            row.key === "api_key" &&
            row.value &&
            row.value.trim() !== "undefined"
          )
            process.env.AI_API_KEY = row.value;
          if (
            row.key === "api_base_url" &&
            row.value &&
            row.value.trim() !== "undefined" &&
            row.value.startsWith("http")
          )
            process.env.AI_BASE_URL = row.value;
          if (
            row.key === "api_model" &&
            row.value &&
            row.value.trim() !== "undefined"
          ) {
            process.env.AI_MODEL = row.value;
            process.env.AI_MEMORY_MODEL = row.value;
          }
        });
        console.log(
          "已从数据库安全加载主 API 配置, 模型:",
          process.env.AI_MODEL,
        );
      }

      const { data: subData } = await db
        .from("user_profile")
        .select("key, value")
        .in("key", ["sub_api_key", "sub_api_base_url", "sub_api_model"]);
      if (subData) {
        subData.forEach((row) => {
          if (
            row.key === "sub_api_key" &&
            row.value &&
            row.value.trim() !== "undefined"
          )
            process.env.AI_SUB_API_KEY = row.value;
          if (
            row.key === "sub_api_base_url" &&
            row.value &&
            row.value.trim() !== "undefined" &&
            row.value.startsWith("http")
          )
            process.env.AI_SUB_BASE_URL = row.value;
          if (
            row.key === "sub_api_model" &&
            row.value &&
            row.value.trim() !== "undefined"
          )
            process.env.AI_SUB_MODEL = row.value;
        });
        console.log(
          "已从数据库安全加载副 API 配置, 模型:",
          process.env.AI_SUB_MODEL,
        );
      }
    } catch (e) {
      console.error("加载 API 配置失败:", e);
    }
  }, 1000);
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// 健康检查（供前端检测云端是否可用）
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now(), mode: APP_MODE });
});

const githubRoutes = require("./routes/github");
app.use("/api/github", githubRoutes);

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

server.listen(PORT, () => {
  console.log(`服务运行在 http://localhost:${PORT}`);
});
