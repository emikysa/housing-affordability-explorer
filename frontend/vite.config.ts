import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Generate build timestamp in format: 2026-02-02-1011T (US Mountain Time)
function getBuildTime() {
  const now = new Date()
  // Convert to Mountain Time (America/Denver)
  const mountainTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }))
  const year = mountainTime.getFullYear()
  const month = String(mountainTime.getMonth() + 1).padStart(2, '0')
  const day = String(mountainTime.getDate()).padStart(2, '0')
  const hours = String(mountainTime.getHours()).padStart(2, '0')
  const minutes = String(mountainTime.getMinutes()).padStart(2, '0')
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
