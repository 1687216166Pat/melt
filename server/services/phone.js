// server/services/phone.js
const { getDB } = require("../db/index");
const { pushToAll } = require("../ws/socket");

async function reportStatus(statusType, statusData) {
  const db = getDB();
  await db.from("phone_status").insert({
    status_type: statusType,
    status_data: JSON.stringify(statusData),
  });

  if (statusType === "app_open") {
    pushToAll(`我看到你打开了 ${statusData.appName}，需要帮忙吗？`);
  }
}

async function getLatestStatus() {
  const db = getDB();
  const { data } = await db
    .from("phone_status")
    .select("*")
    .order("id", { ascending: false })
    .limit(10);
  return data || [];
}

module.exports = { reportStatus, getLatestStatus };
