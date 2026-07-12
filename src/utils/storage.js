const MODE = typeof __APP_MODE__ !== "undefined" ? __APP_MODE__ : "personal";

export const isLocalMode = MODE === "local" || MODE === "lite";

// 统一的数据读写接口
export const storage = {
  // 消息
  getMessages(personaId) {
    if (!isLocalMode) return null;
    const data = localStorage.getItem(`messages_${personaId}`);
    return data ? JSON.parse(data) : [];
  },
  saveMessages(personaId, messages) {
    if (!isLocalMode) return;
    localStorage.setItem(`messages_${personaId}`, JSON.stringify(messages));
  },

  // 角色
  getPersonas() {
    if (!isLocalMode) return null;
    const data = localStorage.getItem("local_personas");
    return data ? JSON.parse(data) : [];
  },
  savePersonas(personas) {
    if (!isLocalMode) return;
    localStorage.setItem("local_personas", JSON.stringify(personas));
  },
  getPersona(id) {
    const personas = this.getPersonas() || [];
    return personas.find((p) => p.id === id) || null;
  },
  savePersona(persona) {
    const personas = this.getPersonas() || [];
    const idx = personas.findIndex((p) => p.id === persona.id);
    if (idx > -1) personas[idx] = persona;
    else personas.push(persona);
    this.savePersonas(personas);
  },
  deletePersona(id) {
    const personas = this.getPersonas() || [];
    this.savePersonas(personas.filter((p) => p.id !== id));
  },

  // 记忆
  getMemories(personaId) {
    if (!isLocalMode) return null;
    const data = localStorage.getItem(`memories_${personaId}`);
    return data ? JSON.parse(data) : [];
  },
  saveMemory(personaId, memory) {
    const memories = this.getMemories(personaId) || [];
    memories.push({
      ...memory,
      id: Date.now(),
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(`memories_${personaId}`, JSON.stringify(memories));
  },

  // 用户资料
  getUserProfile(key) {
    return localStorage.getItem(`profile_${key}`);
  },
  setUserProfile(key, value) {
    localStorage.setItem(`profile_${key}`, value);
  },

  // API 配置
  getApiConfig() {
    const data = localStorage.getItem("local_api_config");
    return data
      ? JSON.parse(data)
      : {
          apiKey: "",
          apiUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini",
          temperature: 0.7,
        };
  },
  saveApiConfig(config) {
    localStorage.setItem("local_api_config", JSON.stringify(config));
  },
};
