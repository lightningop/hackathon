import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// NOTE: Using HTTP for development. Chrome treats http://localhost as a
// secure context, so getUserMedia and SpeechRecognition both work without
// needing a self-signed certificate (which Chrome's speech API rejects).
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
