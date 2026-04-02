/**
 * vite.config.js — Vite Build Configuration
 *
 * Configures the Vite development server and production build.
 *
 * Key settings:
 *   - react() plugin: enables JSX transform and React Fast Refresh (HMR)
 *   - base: sets the public URL path
 *     - In dev ('serve'): uses '/' for local development
 *     - In production ('build'): uses '/TravelMaps.github.io/' for GitHub Pages
 *       (this must match the GitHub repository name for assets to load correctly)
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : '/TravelMaps.github.io/',
}))
