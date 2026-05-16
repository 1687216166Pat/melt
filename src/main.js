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

// iOS standalone 模式额外处理
if (window.navigator.standalone) {
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.style.height = "100%";
}

app.mount("#app");
