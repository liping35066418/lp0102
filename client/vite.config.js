import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3872,
    proxy: {
      '/api': {
        target: 'http://localhost:8872',
        changeOrigin: true,
      },
    },
  },
})
