// src/stores/chat.js
import { defineStore } from "pinia";
import { ref } from "vue";

export const useChatStore = defineStore("chat", () => {
  const messages = ref([]);

  function addMessage(msg) {
    messages.value.push({
      id: msg.id || Date.now() + Math.random(),
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
    });
  }

  async function loadHistory() {
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      messages.value = data.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
    } catch (e) {
      console.error("加载历史消息失败:", e);
    }
  }

  return { messages, addMessage, loadHistory };
});
