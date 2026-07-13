import { useState } from 'react';
import { LogIn, Map, HelpCircle, User, Loader2, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import HowToUseModal from '../UI/HowToUseModal';
import './LoginPage.css';

export default function RegisterPage({ onSwitchToLogin, onBackToLanding }) {
    const { register, error, clearError } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [localError, setLocalError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        clearError();

        if (!name.trim() || !email.trim() || !password.trim()) {
            setLocalError('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        const { error } = await register(email, password, name);
        if (!error) {
            // Success, handled by AuthContext if auto-login occurs,
            // or we might need to tell user to log in if confirm email is required.
            // For now, if no error, AuthContext handles state transition.
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
                    Register a new account
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
                            type="text"
                            className="login-input"
                            placeholder="Your display name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                        <User size={18} className="input-icon" />
                        <input
                            type="email"
                            className="login-input"
                            placeholder="Your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
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
                                Registering...
                            </>
                        ) : (
                            <>
                                Register
                                <LogIn size={20} />
                            </>
                        )}
                    </button>
                    
                </form>

                <div style={{ marginTop: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <p style={{ color: 'var(--text-secondary)'}}>
                        Already have an account?{' '}
                        <button type="button" onClick={onSwitchToLogin} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline'}}>
                            Log In
                        </button>
                    </p>
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
