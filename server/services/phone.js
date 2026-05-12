// server/services/phone.js
const { getDB } = require("../db/index");
const { pushToAll } = require("../ws/socket");

// 接收手机上报的状态
function reportStatus(statusType, statusData) {
  const db = getDB();
  db.prepare(
    "INSERT INTO phone_status (status_type, status_data) VALUES (?, ?)",
  ).run(statusType, JSON.stringify(statusData));

  // 可以根据状态触发 AI 主动发消息
  if (statusType === "app_open") {
    pushToAll(`我看到你打开了 ${statusData.appName}，需要帮忙吗？`);
  }
}

function getLatestStatus() {
  const db = getDB();
  return db
    .prepare("SELECT * FROM phone_status ORDER BY id DESC LIMIT 10")
    .all();
}

module.exports = { reportStatus, getLatestStatus };
