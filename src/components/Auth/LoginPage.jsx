import { useState } from 'react';
import { LogIn, Map, HelpCircle } from 'lucide-react';
import HowToUseModal from '../UI/HowToUseModal';
import './LoginPage.css';

export default function LoginPage({ onLogin }) {
    const [name, setName] = useState('');
    const [isHowToOpen, setIsHowToOpen] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(name || 'Traveler');
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-logo">
                    <Map size={64} color="#3ea6ff" />
                </div>
                <h1 className="login-title">TravelMaps</h1>
                <p className="login-subtitle">Your personal travel journal</p>

                <form onSubmit={handleSubmit} className="login-form">
                    <input
                        type="text"
                        className="login-input"
                        placeholder="Enter your name..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <button type="submit" className="login-btn">
                        Start Exploring <LogIn size={20} />
                    </button>
                </form>

                <button
                    className="secondary"
                    onClick={() => setIsHowToOpen(true)}
                    style={{
                        marginTop: '16px',
                        width: '100%',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'transparent',
                        border: '1px solid var(--border)'
                    }}
                >
                    <HelpCircle size={18} /> How to Use
                </button>
            </div>

            <HowToUseModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} />
        </div>
    );
}
