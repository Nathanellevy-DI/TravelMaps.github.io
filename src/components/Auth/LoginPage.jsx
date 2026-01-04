
import { useState } from 'react';
import { LogIn, Map } from 'lucide-react';
import './LoginPage.css';

export default function LoginPage({ onLogin }) {
    const [name, setName] = useState('');

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
            </div>
        </div>
    );
}
