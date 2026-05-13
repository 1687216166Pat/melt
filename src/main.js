import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./assets/main.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);

// 全局错误处理，防止白屏
app.config.errorHandler = (err, vm, info) => {
  console.error("全局错误:", err, info);
};

app.mount("#app");
