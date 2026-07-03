import { createApp } from 'vue'

import { registerPlugins } from '@/app/plugins'

import App from './App.vue'
import router from './router'
import './assets/styles/main.css'

const app = createApp(App)

registerPlugins(app)
app.use(router)

app.mount('#app')
