// src/composables/useWebSocket.js
import { ref } from "vue";

let socket = null;
const isConnected = ref(false);
const messageHandlers = new Set();

function getWsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  const port = 3001;
  return `${protocol}//${host}:${port}`;
}

function connect() {
  if (socket && socket.readyState === WebSocket.OPEN) return;
  if (socket && socket.readyState === WebSocket.CONNECTING) return;

  socket = new WebSocket(getWsUrl());

  socket.onopen = () => {
    isConnected.value = true;
    console.log("WebSocket 已连接");
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    messageHandlers.forEach((handler) => handler(data));

    if (document.hidden && (data.type === "chat" || data.type === "push")) {
      sendSystemNotification(data.content);
    }
  };

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

    const res = await fetch("/api/push/vapid-key");
    const { key } = await res.json();

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });

    await fetch("/api/push/subscribe", {
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
