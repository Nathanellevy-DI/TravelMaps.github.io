import React from 'react';
import { Map, MapPin, Share2, Shield, Image, Music, ArrowRight, Mail } from 'lucide-react';
import './LandingPage.css';

export default function LandingPage({ onEnterLogin, onEnterRegister }) {
    return (
        <div className="landing-container">
            {/* Animated Background Orbs */}
            <div className="landing-orb landing-orb-1"></div>
            <div className="landing-orb landing-orb-2"></div>
            <div className="landing-orb landing-orb-3"></div>

            {/* Header */}
            <header className="landing-header">
                <div className="landing-logo-container">
                    <Map size={32} className="landing-logo-icon" />
                    <span className="landing-logo-text">TravelMaps</span>
                </div>
                <div className="landing-header-actions">
                    <button className="secondary small-btn" onClick={onEnterLogin}>Log In</button>
                    <button className="primary small-btn" onClick={onEnterRegister}>Sign Up</button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="landing-hero">
                <h1 className="landing-title">
                    Collect Memories. <br />
                    <span>Map Your Journey.</span>
                </h1>
                <p className="landing-subtitle">
                    TravelMaps is a private, interactive mapping platform. Save your favorite locations, add rich media memories, and share your adventures with a trusted circle.
                </p>
                <div className="landing-hero-actions">
                    <button className="primary hero-btn" onClick={onEnterRegister}>
                        Get Started Free <ArrowRight size={18} />
                    </button>
                    <button className="secondary hero-btn" onClick={onEnterLogin}>
                        Open App
                    </button>
                </div>
            </section>

            {/* Features Grid */}
            <section className="landing-features">
                <h2 className="landing-section-title">Features Built for Explorers</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <MapPin size={24} />
                        </div>
                        <h3>Interactive Pinning</h3>
                        <p>Click anywhere on the map to drop a pin. Categorize locations and customize colors for a personalized map layout.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <Image size={24} />
                        </div>
                        <h3>Multimedia Memories</h3>
                        <p>Attach notes, photos, music, and details to your pinned locations. Turn coordinates into rich, digital scrapbooks.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <Shield size={24} />
                        </div>
                        <h3>Local & Secure</h3>
                        <p>Your data is stored securely in your browser's local IndexedDB. Keep your travel journal private or choose what to export.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <Share2 size={24} />
                        </div>
                        <h3>Trusted Social Sharing</h3>
                        <p>Connect with close friends to share specific pins. Control visibility settings on every location you add.</p>
                    </div>
                </div>
            </section>

            {/* Footer / Contact */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-brand">
                        <Map size={24} className="footer-logo" />
                        <span>TravelMaps</span>
                    </div>
                    <div className="footer-contact">
                        <Mail size={16} />
                        <span>Contact us: <a href="mailto:travelmaps@inbox.ru">travelmaps@inbox.ru</a></span>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} TravelMaps. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
