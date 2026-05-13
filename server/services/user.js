// server/services/user.js
const { getDB } = require("../db/index");

async function setUserInfo(key, value) {
  const db = getDB();
  await db.from("user_profile").upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
}

async function getUserInfo(key) {
  const db = getDB();
  const { data } = await db
    .from("user_profile")
    .select("value")
    .eq("key", key)
    .limit(1);
  return data && data.length > 0 ? data[0].value : null;
}

async function getAllUserInfo() {
  const db = getDB();
  const { data } = await db.from("user_profile").select("key, value");
  return data || [];
}

async function getUserSummary() {
  const info = await getAllUserInfo();
  if (info.length === 0) return "";
  let summary = "\n[用户信息]\n";
  for (const item of info) {
    if (
      item.key !== "memory_profile" &&
      item.key !== "active_persona" &&
      item.key !== "user_prompt" &&
      item.key !== "proactive_settings"
    ) {
      summary += `- ${item.key}: ${item.value}\n`;
    }
  }
  return summary;
}

module.exports = { setUserInfo, getUserInfo, getAllUserInfo, getUserSummary };
