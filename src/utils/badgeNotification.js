/**
 * badgeNotification.js — PWA App Badge Manager
 *
 * Manages the app icon badge (the small number/dot on the app icon)
 * to notify users of unseen updates when the app is installed as a PWA.
 *
 * How it works:
 *   1. CURRENT_VERSION tracks the latest app version (increment when adding features)
 *   2. localStorage stores the last version the user has seen
 *   3. On load, if CURRENT_VERSION > lastSeen, a badge is shown on the app icon
 *   4. When the user opens/focuses the app, the badge is cleared
 *
 * Uses the Navigator Badge API (supported in Chrome, Edge, Samsung Internet).
 * Falls back gracefully on browsers that don't support it.
 */

// App version — increment this number when you add new features
// to trigger a badge notification for existing users
const CURRENT_VERSION = 1;
const STORAGE_KEY = 'travelmaps:lastSeenVersion';

export async function checkAndSetBadge() {
    // Check if Badge API is supported
    if (!('setAppBadge' in navigator)) {
        console.log('Badge API not supported');
        return;
    }

    try {
        const lastSeen = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
        const unseenUpdates = CURRENT_VERSION - lastSeen;

        if (unseenUpdates > 0) {
            // Show badge with number of unseen updates
            await navigator.setAppBadge(unseenUpdates);
            console.log(`Badge set: ${unseenUpdates} new update(s)`);
        }
    } catch (error) {
        console.error('Error setting badge:', error);
    }
}

export async function clearBadge() {
    // Clear the badge and mark current version as seen
    if ('clearAppBadge' in navigator) {
        try {
            await navigator.clearAppBadge();
            localStorage.setItem(STORAGE_KEY, CURRENT_VERSION.toString());
            console.log('Badge cleared, version marked as seen');
        } catch (error) {
            console.error('Error clearing badge:', error);
        }
    } else {
        // Fallback: just update localStorage
        localStorage.setItem(STORAGE_KEY, CURRENT_VERSION.toString());
    }
}

// Check badge on page visibility change (coming back to app)
export function initBadgeTracking() {
    // Clear badge when user opens/focuses the app
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            clearBadge();
        }
    });

    // Also clear on initial load
    clearBadge();
}
