import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  root: resolve(__dirname),
  plugins: [vue()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 7787,
    proxy: {
      '/api': 'http://localhost:7788',
      '/events': { target: 'http://localhost:7788', ws: false, changeOrigin: true },
    },
  },
})
