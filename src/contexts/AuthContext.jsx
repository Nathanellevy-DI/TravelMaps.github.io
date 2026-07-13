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
        const initAuth = () => {
            try {
                const currentUserStr = localStorage.getItem('travelmaps_current_user');
                if (currentUserStr) {
                    setUser(JSON.parse(currentUserStr));
                }
            } catch (err) {
                console.error('Auth error on load:', err);
                localStorage.removeItem('travelmaps_current_user');
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const login = useCallback(async (email, password) => {
        setError(null);
        setIsLoading(true);
        try {
            const users = getLocalUsers();
            const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            
            if (!foundUser) {
                throw new Error('User not found');
            }
            if (foundUser.password !== password) {
                throw new Error('Invalid password');
            }

            const sessionUser = { id: foundUser.id, email: foundUser.email, name: foundUser.name };
            localStorage.setItem('travelmaps_current_user', JSON.stringify(sessionUser));
            localStorage.setItem('travelmaps_token', 'mock_token_' + foundUser.id);
            setUser(sessionUser);
            setIsLoading(false);
            return { data: { user: sessionUser }, error: null };
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
            const users = getLocalUsers();
            const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
            if (exists) {
                throw new Error('Email already exists');
            }

            const newId = 'u_' + Date.now();
            const name = displayName || email.split('@')[0];
            const newUser = { id: newId, email, password, name };
            
            users.push(newUser);
            saveLocalUsers(users);

            const sessionUser = { id: newId, email, name };
            localStorage.setItem('travelmaps_current_user', JSON.stringify(sessionUser));
            localStorage.setItem('travelmaps_token', 'mock_token_' + newId);
            setUser(sessionUser);
            setIsLoading(false);
            return { data: { user: sessionUser }, error: null };
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
