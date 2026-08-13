import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The deployed backend's CORS allow-list only covers the production
// frontend origin, not localhost — proxy dev requests server-side
// (browser sees same-origin, so no preflight) instead of hitting CORS.
const BACKEND_URL = 'https://track-backend-mxtl.onrender.com'
const API_PREFIXES = ['/auth', '/tasks', '/projects', '/sprints', '/forms', '/members', '/meetings', '/departments']

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: Object.fromEntries(
      API_PREFIXES.map((prefix) => [
        prefix,
        {
          target: BACKEND_URL,
          changeOrigin: true,
          // changeOrigin only rewrites the Host header — the backend also
          // rejects on the Origin header itself, so drop it so the request
          // reads as same-origin to the backend's CORS check.
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
          },
        },
      ])
    ),
  },
})