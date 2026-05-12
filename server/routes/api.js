// server/routes/api.js
const express = require("express");
const router = express.Router();
const { reportStatus, getLatestStatus } = require("../services/phone");
const { getDB } = require("../db/index");

// 手机状态上报接口
router.post("/phone/status", (req, res) => {
  const { type, data } = req.body;
  reportStatus(type, data);
  res.json({ success: true });
});

// 获取手机状态
router.get("/phone/status", (req, res) => {
  const status = getLatestStatus();
  res.json(status);
});

// 获取聊天记录
router.get("/messages", (req, res) => {
  const db = getDB();
  const messages = db
    .prepare("SELECT * FROM messages ORDER BY id DESC LIMIT 50")
    .all()
    .reverse();
  res.json(messages);
});

module.exports = router;
