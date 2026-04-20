import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5277,
    proxy: {
      '/api': {
        target: 'http://localhost:8020',
        changeOrigin: true,
        // 重写路径，移除末尾斜杠导致的重定向问题
        rewrite: (path) => path,
      },
    },
  },
})
