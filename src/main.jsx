/**
 * main.jsx — Application Entry Point
 *
 * This is the first file that runs when the app loads.
 * It creates the React root, renders the App component inside StrictMode,
 * and initializes PWA badge tracking.
 *
 * StrictMode causes components to render twice in development (not production)
 * to help detect impure renders and other issues.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initBadgeTracking } from './utils/badgeNotification.js'

// Initialize badge tracking (clears badge when app opens)
initBadgeTracking();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
