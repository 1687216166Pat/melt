// server/services/session.js
const { getDB } = require("../db/index");

async function createSession(title) {
  const db = getDB();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  await db.from("sessions").insert({ id, title: title || "新对话" });
  return id;
}

async function getSessions() {
  const db = getDB();
  const { data } = await db
    .from("sessions")
    .select("*")
    .order("updated_at", { ascending: false });
  return data || [];
}

async function getSessionMessages(sessionId, limit = 50) {
  const db = getDB();
  const { data } = await db
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("id", { ascending: false })
    .limit(limit);
  return (data || []).reverse();
}

async function updateSessionTitle(sessionId, title) {
  const db = getDB();
  await db
    .from("sessions")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

async function deleteSession(sessionId) {
  const db = getDB();
  await db.from("messages").delete().eq("session_id", sessionId);
  await db.from("sessions").delete().eq("id", sessionId);
}

async function getCurrentSession() {
  const db = getDB();
  const { data } = await db
    .from("sessions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (data && data.length > 0) return data[0];
  const id = await createSession("新对话");
  return { id, title: "新对话" };
}

async function touchSession(sessionId) {
  const db = getDB();
  await db
    .from("sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

module.exports = {
  createSession,
  getSessions,
  getSessionMessages,
  updateSessionTitle,
  deleteSession,
  getCurrentSession,
  touchSession,
};
