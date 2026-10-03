import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // three.js alone is ~700 kB minified; a single game bundle is expected.
  build: { chunkSizeWarningLimit: 1600 },
})
