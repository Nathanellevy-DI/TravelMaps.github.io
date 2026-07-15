import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

// Helper to get local users list
const getLocalUsers = () => {
    try {
        return JSON.parse(localStorage.getItem('travelmaps_users') || '[]');
    } catch {
        return [];
    }
};

// Helper to save local users list
const saveLocalUsers = (users) => {
    localStorage.setItem('travelmaps_users', JSON.stringify(users));
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('travelmaps_token');
            const currentUserStr = localStorage.getItem('travelmaps_current_user');
            if (token && currentUserStr) {
                try {
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                    const response = await fetch(`${apiUrl}/api/auth/me`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setUser(data.user);
                    } else {
                        throw new Error('Token verification failed');
                    }
                } catch (err) {
                    console.error('Auth error on load:', err);
                    localStorage.removeItem('travelmaps_current_user');
                    localStorage.removeItem('travelmaps_token');
                    setUser(null);
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const login = useCallback(async (email, password) => {
        setError(null);
        setIsLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email.trim(), password })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            localStorage.setItem('travelmaps_current_user', JSON.stringify(data.user));
            localStorage.setItem('travelmaps_token', data.token);
            setUser(data.user);
            setIsLoading(false);
            return { data: { user: data.user }, error: null };
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            return { data: null, error: err };
        }
    }, []);

    const register = useCallback(async (email, password, displayName) => {
        setError(null);
        setIsLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${apiUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email.trim(), password, display_name: displayName })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            localStorage.setItem('travelmaps_current_user', JSON.stringify(data.user));
            localStorage.setItem('travelmaps_token', data.token);
            setUser(data.user);
            setIsLoading(false);
            return { data: { user: data.user }, error: null };
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            return { data: null, error: err };
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('travelmaps_current_user');
        localStorage.removeItem('travelmaps_token');
        setUser(null);
    }, []);

    const value = {
        user,
        isLoading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        clearError: () => setError(null),
    };

    return (
        <AuthContext.Provider value={value}>
            {!isLoading ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)' }}>
                    Loading...
                </div>
            )}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
