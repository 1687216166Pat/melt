import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import ChatView from "../views/ChatView.vue";
import AboutView from "../views/AboutView.vue";
import SettingsView from "../views/SettingsView.vue";
import MemoryView from "../views/MemoryView.vue";
import PersonaDetailView from "../views/PersonaDetailView.vue";
import WorldBookView from "../views/WorldBookView.vue";
import SettingsApiView from "../views/settings/SettingsApiView.vue";
import SettingsControlView from "../views/settings/SettingsControlView.vue";
import SettingsGeneralView from "../views/settings/SettingsGeneralView.vue";
import SettingsNotifView from "../views/settings/SettingsNotifView.vue";
import SettingsStorageView from "../views/settings/SettingsStorageView.vue";
import SettingsMemoryView from "../views/settings/SettingsMemoryView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/chat/:personaId", name: "chat", component: ChatView },
    { path: "/about", name: "about", component: AboutView },
    { path: "/settings", name: "settings", component: SettingsView },
    { path: "/memory", name: "memory", component: MemoryView },
    {
      path: "/persona-detail/:personaId",
      name: "persona-detail",
      component: PersonaDetailView,
    },
    { path: "/worldbook", name: "worldbook", component: WorldBookView },
    { path: "/settings/api", name: "settings-api", component: SettingsApiView },
    {
      path: "/settings/control",
      name: "settings-control",
      component: SettingsControlView,
    },
    {
      path: "/settings/general",
      name: "settings-general",
      component: SettingsGeneralView,
    },
    {
      path: "/settings/notifications",
      name: "settings-notifications",
      component: SettingsNotifView,
    },
    {
      path: "/settings/storage",
      name: "settings-storage",
      component: SettingsStorageView,
    },
    {
      path: "/settings/memory-manage",
      name: "settings-memory-manage",
      component: SettingsMemoryView,
    },
  ],
});

export default router;
