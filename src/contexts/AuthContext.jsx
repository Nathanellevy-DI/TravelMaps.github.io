/**
 * AuthContext.jsx — Custom API Authentication Context
 *
 * Provides authentication state and methods throughout the app connected to Express backend.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchApi, getToken, setToken } from '../services/apiClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initAuth = async () => {
            const token = getToken();
            if (token) {
                try {
                    const data = await fetchApi('/auth/me');
                    setUser(data.user);
                } catch (err) {
                    console.error('Auth error on load:', err);
                    setToken(null);
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
            const data = await fetchApi('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            setToken(data.token);
            setUser(data.user);
            setIsLoading(false);
            return { data, error: null };
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
            const data = await fetchApi('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, password, display_name: displayName })
            });
            setToken(data.token);
            setUser(data.user);
            setIsLoading(false);
            return { data, error: null };
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            return { data: null, error: err };
        }
    }, []);

    const logout = useCallback(() => {
        setToken(null);
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
