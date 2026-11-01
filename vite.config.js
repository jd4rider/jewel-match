import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative asset paths work for file:// in Electron and any GitHub Pages sub-path.
  base: './',
  plugins: [react()],
})
