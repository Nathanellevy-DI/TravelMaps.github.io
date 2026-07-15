import { useState } from 'react';
import { LogIn, Map, HelpCircle, User, Loader2, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import HowToUseModal from '../UI/HowToUseModal';
import './LoginPage.css';

export default function LoginPage({ onSwitchToRegister, onBackToLanding }) {
    const { login, error, clearError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [localError, setLocalError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        clearError();

        if (!email.trim() || !password.trim()) {
            setLocalError('Please enter both email and password');
            return;
        }

        setIsLoading(true);
        const { error } = await login(email, password);
        if (!error) {
            // Success, handled by AuthContext via onAuthStateChange
        } else {
            setIsLoading(false);
        }
    };

    const displayError = localError || error;

    return (
        <div className="login-container">
            <div className="login-bg-orb login-bg-orb-1"></div>
            <div className="login-bg-orb login-bg-orb-2"></div>
            <div className="login-bg-orb login-bg-orb-3"></div>

            <div className="login-card">
                <div className="login-logo">
                    <Map size={56} />
                </div>

                <h1 className="login-title">TravelMaps</h1>
                <p className="login-subtitle">
                    Login to start exploring
                </p>

                {displayError && (
                    <div className="login-error">
                        <AlertCircle size={16} />
                        <span>{displayError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                        <User size={18} className="input-icon" />
                        <input
                            type="email"
                            className="login-input"
                            placeholder="Your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <Lock size={18} className="input-icon" />
                        <input
                            type="password"
                            className="login-input"
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <button type="submit" className="login-btn" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="spin" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                Log In
                                <LogIn size={20} />
                            </>
                        )}
                    </button>
                    
                </form>

                <div style={{ marginTop: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    {onBackToLanding && (
                        <button type="button" onClick={onBackToLanding} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}>
                            Back to Home
                        </button>
                    )}
                </div>

                <button
                    className="login-help-btn"
                    onClick={() => setIsHowToOpen(true)}
                    disabled={isLoading}
                >
                    <HelpCircle size={18} /> How to Use
                </button>
            </div>

            <HowToUseModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} />
        </div>
    );
}
