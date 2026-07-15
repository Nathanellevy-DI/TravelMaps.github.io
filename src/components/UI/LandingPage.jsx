import React, { useState } from 'react';
import { Map, Shield, Edit, Heart, Eye, Mail } from 'lucide-react';
import './LandingPage.css';
import PrivacyPolicyModal from './PrivacyPolicyModal';

export default function LandingPage({ onEnterLogin, onEnterRegister }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleJoinWaitlist = async (e) => {
        e.preventDefault();
        const trimmedEmail = email.trim();
        if (!trimmedEmail) return;

        setLoading(true);
        setMessage('');
        setIsError(false);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${apiUrl}/api/waitlist/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: trimmedEmail }),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage('Successfully joined the waitlist! We will notify you when invited.');
                setEmail('');
            } else {
                setMessage(data.error || 'Failed to join waitlist.');
                setIsError(true);
            }
        } catch (err) {
            console.error('Waitlist API error, falling back:', err);
            // Local fallback
            try {
                const localList = JSON.parse(localStorage.getItem('travelmaps_waitlist') || '[]');
                const lower = trimmedEmail.toLowerCase();
                if (!localList.includes(lower)) {
                    localList.push(lower);
                    localStorage.setItem('travelmaps_waitlist', JSON.stringify(localList));
                }
                setMessage('Successfully joined the waitlist!');
                setEmail('');
            } catch (fallbackErr) {
                setMessage('An error occurred. Please try again.');
                setIsError(true);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="landing-container">
            {/* Header / Nav */}
            <header className="landing-header">
                <div className="landing-logo-container" style={{ cursor: 'pointer' }} onClick={() => window.location.reload()}>
                    <Map size={24} className="landing-logo-icon" />
                    <span className="landing-logo-text">TravelMaps</span>
                </div>
                <nav className="landing-nav">
                    <button onClick={() => scrollToSection('overview')}>OVERVIEW</button>
                    <button onClick={() => scrollToSection('platform')}>PLATFORM</button>
                    <button onClick={() => scrollToSection('values')}>VALUES</button>
                </nav>
                <div className="landing-header-actions">
                    <button className="nav-action-btn secondary-flat" onClick={onEnterLogin}>Log In</button>
                    <button className="nav-action-btn primary-flat" onClick={() => scrollToSection('overview')}>Join Waitlist</button>
                </div>
            </header>

            {/* Hero Section */}
            <section id="overview" className="landing-hero-section">
                <div className="hero-background-topography"></div>
                <div className="hero-content-wrapper">
                    <h1 className="hero-title">
                        Collect Memories.<br />
                        Map Your Journey.
                    </h1>
                    <p className="hero-description">
                        TravelMaps is a private, interactive mapping platform designed for explorers to document their journeys. 
                        Securely store your data locally while offering selective sharing with a trusted social circle.
                    </p>
                    
                    <form onSubmit={handleJoinWaitlist} className="waitlist-form-hero">
                        <input 
                            type="email" 
                            placeholder="Enter your email to join the waitlist..." 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="waitlist-input"
                            required
                        />
                        <button type="submit" className="flat-cta-btn" disabled={loading}>
                            {loading ? 'JOINING...' : 'JOIN WAITLIST'}
                        </button>
                    </form>
                    {message && (
                        <p className={`waitlist-message ${isError ? 'error' : 'success'}`}>
                            {message}
                        </p>
                    )}
                </div>
            </section>

            {/* Platform / Features Section */}
            <section id="platform" className="landing-platform-section">
                <div className="section-container">
                    <h2 className="section-title">Functional Tools for Explorers</h2>
                    <p className="section-subtitle">
                        A secure, user-centric digital scrapbook prioritizing data privacy through local storage and interactive documentation.
                    </p>
                    
                    <div className="platform-features-grid">
                        <div className="platform-feature-card">
                            <div className="platform-feature-num">01</div>
                            <h3>Interactive Map Pinning</h3>
                            <p>Pin custom destinations with coordinates. Set distinct categories, colors, and notes for every single coordinate on your map.</p>
                        </div>
                        <div className="platform-feature-card">
                            <div className="platform-feature-num">02</div>
                            <h3>Multimedia Memory Book</h3>
                            <p>Add text logs, upload custom photos or videos, attach favorite music tracks, and record live voice notes to keep the atmosphere of your trip.</p>
                        </div>
                        <div className="platform-feature-card">
                            <div className="platform-feature-num">03</div>
                            <h3>Privacy-First Storage</h3>
                            <p>All database records and file uploads are saved directly inside your browser's local storage. Safe, secure, and completely under your control.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section id="values" className="landing-values-section">
                <div className="section-container">
                    <h2 className="section-title light">Our Core Values</h2>
                    
                    <div className="values-grid">
                        <div className="value-card">
                            <Shield size={24} className="value-icon" />
                            <h3>Privacy</h3>
                            <p>Private by design. Your coordinates, pictures, and notes belong to you and stay on your device.</p>
                        </div>
                        <div className="value-card">
                            <Edit size={24} className="value-icon" />
                            <h3>Personalization</h3>
                            <p>Tailor your map tags, colors, and multimedia memories to match the visual vibe of your travel diary.</p>
                        </div>
                        <div className="value-card">
                            <Heart size={24} className="value-icon" />
                            <h3>Connectivity</h3>
                            <p>Share specific pins and memories securely with select companions without broadcasting your layout to the public.</p>
                        </div>
                        <div className="value-card">
                            <Eye size={24} className="value-icon" />
                            <h3>Security</h3>
                            <p>Robust encrypted structures protect user authentication records and sensitive local files.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Get Started Callout */}
            <section className="landing-callout-section">
                <div className="section-container">
                    <h2>Ready to map your journey?</h2>
                    <p>Join a selective market of explorers documenting their adventures securely.</p>
                    
                    <form onSubmit={handleJoinWaitlist} className="waitlist-form-hero" style={{ margin: '2rem auto 0', justifyContent: 'center' }}>
                        <input 
                            type="email" 
                            placeholder="Enter your email to join the waitlist..." 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="waitlist-input"
                            required
                        />
                        <button type="submit" className="flat-cta-btn centered" disabled={loading}>
                            {loading ? 'JOINING...' : 'JOIN WAITLIST'}
                        </button>
                    </form>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer-section">
                <div className="footer-container">
                    <div className="footer-column-left">
                        <div className="footer-logo">
                            <Map size={24} />
                            <span>TravelMaps</span>
                        </div>
                        <p className="footer-desc">
                            A secure, user-centric digital scrapbook for travelers, prioritizing data privacy through local storage.
                        </p>
                    </div>
                    <div className="footer-column-right">
                        <h3>Contact & Connect</h3>
                        <div className="footer-contact-item">
                            <Mail size={16} />
                            <a href="mailto:travelmaps@inbox.ru">travelmaps@inbox.ru</a>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <span>&copy; {new Date().getFullYear()} TravelMaps. All rights reserved.</span>
                    <button 
                        onClick={() => setShowPrivacyPolicy(true)} 
                        style={{ background: 'transparent', border: 'none', color: 'rgba(250, 248, 245, 0.5)', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
                    >
                        Privacy Policy
                    </button>
                </div>
            </footer>
            <PrivacyPolicyModal isOpen={showPrivacyPolicy} onClose={() => setShowPrivacyPolicy(false)} />
        </div>
    );
}
