/**
 * vite.config.js — Vite Build Configuration
 *
 * Configures the Vite development server and production build.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Changed to '/' so it works correctly on Vercel!
})
