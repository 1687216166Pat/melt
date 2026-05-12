// server/services/ai.js
const { getDB } = require("../db/index");

async function handleChat(userMessage, ws) {
  const db = getDB();

  db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run(
    "user",
    userMessage,
  );

  const history = db
    .prepare("SELECT role, content FROM messages ORDER BY id DESC LIMIT 20")
    .all()
    .reverse();

  const body = JSON.stringify({
    model: process.env.AI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "你是用户手机里的 AI 助手，语气温柔亲切，像朋友一样聊天。你可以感知用户的手机状态。",
      },
      ...history.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ],
  });

  const response = await fetch(`${process.env.AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: body,
  });

  const data = await response.json();

  if (!data.choices || !data.choices[0]) {
    console.error("AI 返回异常:", data);
    ws.send(
      JSON.stringify({
        type: "chat",
        role: "ai",
        content: "抱歉，我暂时无法回复。",
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  const aiReply = data.choices[0].message.content;
  db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run(
    "ai",
    aiReply,
  );

  ws.send(
    JSON.stringify({
      type: "chat",
      role: "ai",
      content: aiReply,
      timestamp: new Date().toISOString(),
    }),
  );
}

module.exports = { handleChat };
