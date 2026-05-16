// src/composables/useWebSocket.js
import { ref } from "vue";

let socket = null;
let lastMsgId = "";
const isConnected = ref(false);
const messageHandlers = new Set();
let processedIds = new Set();
let lastFullContent = ''

function getWsUrl() {
  // 生产环境直连 Railway
  if (import.meta.env.PROD) {
    return "wss://gpt1-production-ba3b.up.railway.app";
  }
  // 本地开发
  return `ws://${window.location.hostname}:3001`;
}

function connect() {
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  )
    return;

  // 关闭旧连接
  if (socket) {
    socket.onclose = null; // 防止触发重连
    socket.close();
    socket = null;
  }

  socket = new WebSocket(getWsUrl());

  socket.onopen = () => {
    isConnected.value = true;
    console.log("WebSocket 已连接");
  };

socket.onmessage = (event) => {
    const data = JSON.parse(event.data)
    
    // 用完整内容去重
    const fullId = data.type + (data.content || '') + (data.timestamp || '')
    if (fullId === lastFullContent) return
    lastFullContent = fullId

    messageHandlers.forEach((handler) => handler(data))

    if (document.hidden && (data.type === "chat" || data.type === "push")) {
        sendSystemNotification(data.content)
    }
}

  socket.onclose = () => {
    isConnected.value = false;
    socket = null;
    setTimeout(connect, 3000);
  };

  socket.onerror = () => {
    socket.close();
  };
}

function send(data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

function onMessage(handler) {
  messageHandlers.add(handler);
}

function removeHandler(handler) {
  messageHandlers.delete(handler);
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendSystemNotification(content) {
  if ("Notification" in window && Notification.permission === "granted") {
    const notif = new Notification("AI 助手", {
      body: content.length > 60 ? content.slice(0, 60) + "..." : content,
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  }
}

async function registerPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;

    const BASE = import.meta.env.VITE_API_URL || "";
    const res = await fetch(`${BASE}/api/push/vapid-key`);
    const { key } = await res.json();

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });

    await fetch(`${BASE}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });

    console.log("Push 订阅成功");
  } catch (err) {
    console.error("Push 订阅失败:", err);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebSocket() {
  return {
    connect,
    send,
    onMessage,
    removeHandler,
    isConnected,
    requestNotificationPermission,
    registerPushSubscription,
  };
}
