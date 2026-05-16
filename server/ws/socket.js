const { WebSocketServer } = require("ws");
const { handleChat } = require("../services/ai");
const { pushNotification } = require("../services/push");

let wss;
let clients = new Set();

function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log("客户端已连接");

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === "chat") {
          await handleChat(msg.content, ws, msg.personaId);
        }
      } catch (err) {
        console.error("消息处理错误:", err);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
    });
  });
}

function getClients() {
  return clients;
}

function pushToAll(message) {
  const payload = JSON.stringify({
    type: "push",
    role: "ai",
    content: message,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.send(payload);
    }
  });

  const preview = message.length > 60 ? message.slice(0, 60) + "..." : message;
  pushNotification("AI 助手", preview);
}

module.exports = { initWebSocket, pushToAll, getClients };
