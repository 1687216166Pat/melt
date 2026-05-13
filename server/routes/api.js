// server/routes/api.js
const express = require("express");
const router = express.Router();
const { reportStatus, getLatestStatus } = require("../services/phone");
const { addSubscription } = require("../services/push");
const {
  getRecentMemories,
  deleteRecentMemory,
  getMemoryProfile,
  setMemoryProfile,
  consolidateMemories,
} = require("../services/memory");
const { setUserInfo, getAllUserInfo } = require("../services/user");
const {
  createSession,
  getSessions,
  getSessionMessages,
  deleteSession,
  getCurrentSession,
} = require("../services/session");
const {
  getPersonaList,
  getActivePersona,
  setActivePersona,
  getUserPrompt,
  setUserPrompt,
  getUserPromptTemplate,
} = require("../services/prompt");
const {
  getProactiveSettings,
  setProactiveSettings,
  checkProactiveMessages,
} = require("../services/proactive");

// 手机状态
router.post("/phone/status", async (req, res) => {
  const { type, data } = req.body;
  await reportStatus(type, data);
  res.json({ success: true });
});

router.get("/phone/status", async (req, res) => {
  const status = await getLatestStatus();
  res.json(status);
});

// 聊天记录
router.get("/messages", async (req, res) => {
  const session = await getCurrentSession();
  const messages = await getSessionMessages(session.id);
  res.json(messages);
});

// 会话管理
router.get("/sessions", async (req, res) => {
  const sessions = await getSessions();
  res.json(sessions);
});

router.post("/sessions", async (req, res) => {
  const { title } = req.body;
  const id = await createSession(title);
  res.json({ id, title: title || "新对话" });
});

router.delete("/sessions/:id", async (req, res) => {
  await deleteSession(req.params.id);
  res.json({ success: true });
});

router.get("/sessions/:id/messages", async (req, res) => {
  const messages = await getSessionMessages(req.params.id);
  res.json(messages);
});

// 记忆管理
router.get("/memories", async (req, res) => {
  const profile = await getMemoryProfile();
  const recent = await getRecentMemories(50);
  res.json({ profile, recent });
});

router.put("/memories/profile", async (req, res) => {
  const { content } = req.body;
  await setMemoryProfile(content);
  res.json({ success: true });
});

router.delete("/memories/recent/:id", async (req, res) => {
  await deleteRecentMemory(req.params.id);
  res.json({ success: true });
});

router.post("/memories/consolidate", async (req, res) => {
  try {
    await consolidateMemories();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 用户信息
router.get("/user", async (req, res) => {
  const info = await getAllUserInfo();
  res.json(info);
});

router.post("/user", async (req, res) => {
  const { key, value } = req.body;
  await setUserInfo(key, value);
  res.json({ success: true });
});

// Prompt 管理
router.get("/prompts/personas", (req, res) => {
  res.json({
    personas: getPersonaList(),
    active: getActivePersona(),
  });
});

router.post("/prompts/personas/:id/activate", async (req, res) => {
  const success = await setActivePersona(req.params.id);
  res.json({ success });
});

router.get("/prompts/user", async (req, res) => {
  const content = await getUserPrompt();
  res.json({
    content,
    template: getUserPromptTemplate(),
  });
});

router.post("/prompts/user", async (req, res) => {
  const { content } = req.body;
  await setUserPrompt(content);
  res.json({ success: true });
});

// 主动消息
router.get("/proactive/settings", async (req, res) => {
  const settings = await getProactiveSettings();
  res.json(settings);
});

router.post("/proactive/settings", async (req, res) => {
  await setProactiveSettings(req.body);
  res.json({ success: true });
});

router.post("/proactive/trigger", async (req, res) => {
  await checkProactiveMessages();
  res.json({ success: true });
});

// 推送订阅
router.post("/push/subscribe", (req, res) => {
  addSubscription(req.body);
  res.json({ success: true });
});

router.get("/push/vapid-key", (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;
