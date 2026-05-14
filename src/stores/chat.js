import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "@/utils/api";

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

  async function loadPersonaMessages(personaId) {
    try {
      const res = await api(`/api/messages/${personaId}`);
      const data = await res.json();
      messages.value = data.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
    } catch (e) {
      console.error("加载消息失败:", e);
    }
  }

  function clearMessages() {
    messages.value = [];
  }

  return {
    messages,
    addMessage,
    loadPersonaMessages,
    clearMessages,
  };
});
