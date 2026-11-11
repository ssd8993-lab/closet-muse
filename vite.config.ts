import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built page works from any folder or host.
export default defineConfig({
  base: './',
  plugins: [react()],
})
