import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  // Relative asset paths work for file:// in Electron and any GitHub Pages sub-path.
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        phaser: resolve(import.meta.dirname, 'phaser.html'),
      },
    },
  },
})
