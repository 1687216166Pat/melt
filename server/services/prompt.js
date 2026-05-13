// server/services/prompt.js
const { getDB } = require("../db/index");
const {
  corePrompt,
  personaPrompts,
  userPromptTemplate,
} = require("../config/prompt");

// 缓存（因为 getFullPrompt 在 ai.js 里需要同步调用）
let cachedPersona = personaPrompts.xiaorou.content;
let cachedUserPrompt = "";
let cachedActivePersonaKey = "xiaorou";

// 定期刷新缓存
async function refreshPromptCache() {
  try {
    const db = getDB();

    const { data: personaRow } = await db
      .from("user_profile")
      .select("value")
      .eq("key", "active_persona")
      .limit(1);

    const personaKey =
      personaRow && personaRow.length > 0 ? personaRow[0].value : "xiaorou";
    cachedActivePersonaKey = personaKey;
    cachedPersona = personaPrompts[personaKey]
      ? personaPrompts[personaKey].content
      : personaPrompts.xiaorou.content;

    const { data: promptRow } = await db
      .from("user_profile")
      .select("value")
      .eq("key", "user_prompt")
      .limit(1);

    cachedUserPrompt =
      promptRow && promptRow.length > 0
        ? `\n[用户偏好]\n${promptRow[0].value}`
        : "";
  } catch (e) {
    console.error("刷新 prompt 缓存失败:", e);
  }
}

// 每 30 秒刷新一次缓存
setInterval(refreshPromptCache, 30000);
// 启动时也刷新一次（延迟 2 秒等数据库连接好）
setTimeout(refreshPromptCache, 2000);

function getFullPrompt() {
  return corePrompt + cachedPersona + cachedUserPrompt;
}

function getPersonaList() {
  return Object.entries(personaPrompts).map(([key, value]) => ({
    id: key,
    name: value.name,
    description: value.description,
  }));
}

function getActivePersona() {
  return cachedActivePersonaKey;
}

async function setActivePersona(personaId) {
  if (!personaPrompts[personaId]) return false;
  const db = getDB();
  await db.from("user_profile").upsert(
    {
      key: "active_persona",
      value: personaId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  cachedActivePersonaKey = personaId;
  cachedPersona = personaPrompts[personaId].content;
  return true;
}

async function getUserPrompt() {
  const db = getDB();
  const { data } = await db
    .from("user_profile")
    .select("value")
    .eq("key", "user_prompt")
    .limit(1);
  return data && data.length > 0 ? data[0].value : "";
}

async function setUserPrompt(content) {
  const db = getDB();
  await db.from("user_profile").upsert(
    {
      key: "user_prompt",
      value: content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  cachedUserPrompt = content ? `\n[用户偏好]\n${content}` : "";
}

function getUserPromptTemplate() {
  return userPromptTemplate;
}

module.exports = {
  getFullPrompt,
  getPersonaList,
  getActivePersona,
  setActivePersona,
  getUserPrompt,
  setUserPrompt,
  getUserPromptTemplate,
  refreshPromptCache,
};
