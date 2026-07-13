// server/services/prompt.js
const { getDB } = require("../db/index");
const {
  corePrompt,
  personaPrompts,
  userPromptTemplate,
} = require("../config/prompt");

let cachedPersona = personaPrompts.xiaorou.content;
let cachedUserPrompt = "";
let cachedActivePersonaKey = "xiaorou";

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

setInterval(refreshPromptCache, 30000);
setTimeout(refreshPromptCache, 2000);

function getFullPrompt() {
  return corePrompt + cachedPersona + cachedUserPrompt;
}

function getPersonaList() {
  return Object.entries(personaPrompts).map(([key, value]) => ({
    id: key,
    name: value.name,
    description: value.description,
    avatar: value.avatar || "💬",
  }));
}

function getActivePersona() {
  return cachedActivePersonaKey;
}

async function setActivePersona(personaId) {
  if (!personaPrompts[personaId]) return false;
  const db = getDB();

  const { data: existing } = await db
    .from("user_profile")
    .select("id")
    .eq("key", "active_persona")
    .limit(1);

  if (existing && existing.length > 0) {
    await db
      .from("user_profile")
      .update({ value: personaId, updated_at: new Date().toISOString() })
      .eq("key", "active_persona");
  } else {
    await db
      .from("user_profile")
      .insert({ key: "active_persona", value: personaId });
  }

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

  const { data: existing } = await db
    .from("user_profile")
    .select("id")
    .eq("key", "user_prompt")
    .limit(1);

  if (existing && existing.length > 0) {
    await db
      .from("user_profile")
      .update({ value: content, updated_at: new Date().toISOString() })
      .eq("key", "user_prompt");
  } else {
    await db
      .from("user_profile")
      .insert({ key: "user_prompt", value: content });
  }

  cachedUserPrompt = content ? `\n[用户偏好]\n${content}` : "";
}

function getUserPromptTemplate() {
  return userPromptTemplate;
}

module.exports = require("../config/prompt");
