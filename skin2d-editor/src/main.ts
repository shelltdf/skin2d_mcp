import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { useAppLogStore } from './stores/appLog'
import { useUiSettingsStore } from './stores/uiSettings'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.mount('#app')

// Load and apply persisted UI settings (language/theme)
const ui = useUiSettingsStore()
ui.load()
ui.applyToDom()

app.config.errorHandler = (err, _inst, info) => {
  const log = useAppLogStore()
  const msg = err instanceof Error ? err.message : String(err)
  log.error('Vue 运行时错误', [msg, info].filter(Boolean).join('\n'))
}
