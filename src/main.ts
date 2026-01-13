import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './assets/global/css/scrollbar.scss';
// import './assets/global/ts/index';
import './config/baseConfig';
const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
