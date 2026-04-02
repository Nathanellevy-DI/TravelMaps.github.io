/**
 * InstallPrompt.jsx — PWA Install Banner
 *
 * Displays a non-intrusive banner prompting users to install the app:
 *   - On Android/Chrome: uses the `beforeinstallprompt` event to trigger native install
 *   - On iOS: shows instructions to use "Add to Home Screen" from the Share menu
 *   - Automatically hidden if already installed or previously dismissed
 *   - Appears after a 3-second delay to avoid interrupting initial use
 *
 * The banner can be permanently dismissed; the preference is saved in localStorage.
 */

import { useState, useEffect, useMemo } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);

    // Detect iOS devices outside the effect to avoid calling setState synchronously.
    // useMemo runs during render (not as a side effect) so this is safe.
    const isIOS = useMemo(
        () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
        []
    );

    useEffect(() => {
        // Don't show if user previously dismissed or app is already installed
        const dismissed = localStorage.getItem('travelmaps:install-dismissed');
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        if (dismissed || isStandalone) {
            return;
        }

        // iOS: show instructions banner after a short delay
        if (isIOS && !isStandalone) {
            const timer = setTimeout(() => setShowPrompt(true), 3000);
            return () => clearTimeout(timer);
        }

        // Android/Chrome: listen for the browser's install prompt event
        const handler = (e) => {
            e.preventDefault(); // Prevent the browser's default mini-infobar
            setDeferredPrompt(e); // Save the event so we can trigger it later
            setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [isIOS]);

    /**
     * Triggers the native install prompt (Android/Chrome only).
     * The deferredPrompt was captured from the 'beforeinstallprompt' event.
     */
    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowPrompt(false);
        }
        setDeferredPrompt(null);
    };

    /**
     * Permanently dismisses the install banner.
     * Saves the preference to localStorage so it won't appear again.
     */
    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('travelmaps:install-dismissed', 'true');
    };

    // Don't render anything if the prompt isn't active
    if (!showPrompt) return null;

    return (
        <div className="install-prompt">
            <div className="install-prompt-content">
                {/* Download icon */}
                <Download size={24} className="install-icon" />

                {/* Text — different instructions for iOS vs Android */}
                <div className="install-text">
                    <strong>Install TravelMaps</strong>
                    {isIOS ? (
                        <span>Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong></span>
                    ) : (
                        <span>Add to your home screen for quick access</span>
                    )}
                </div>

                {/* Install button (Android only — iOS can't trigger install programmatically) */}
                {!isIOS && (
                    <button className="install-btn primary" onClick={handleInstall}>
                        Install
                    </button>
                )}

                {/* Dismiss button */}
                <button className="install-close" onClick={handleDismiss} aria-label="Dismiss">
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
