import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { i18n } from "./locales/i18n";
import "splitpanes/dist/splitpanes.css";
import "element-plus/theme-chalk/dark/css-vars.css";
import "./style.css";

createApp(App).use(router).use(i18n).mount("#app");
