import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
  optimizeDeps: {
    include: ['pixi.js', 'pixi-live2d-display/cubism4'],
  },
})
