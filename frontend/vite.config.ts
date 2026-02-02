import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Generate build timestamp in format: 2026-02-02-1011T
function getBuildTime() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}-${hours}${minutes}T`
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  define: {
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(getBuildTime()),
  },
})
