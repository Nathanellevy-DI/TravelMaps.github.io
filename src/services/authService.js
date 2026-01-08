/**
 * Authentication service for TravelMaps
 * Handles user registration, login, and session management
 */

import api, { setTokens, clearTokens } from './api.js';

/**
 * Register a new user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} name - User's display name (becomes username)
 * @returns {Promise<object>} - User data and tokens
 */
export const register = async (email, password, name) => {
    // Backend expects: username, email, password, displayName
    const username = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const data = await api.post('/auth/register', {
        username: username || `user_${Date.now()}`,
        email,
        password,
        displayName: name,
    });

    // Backend returns: { message, user }
    // After registration, auto-login to get tokens
    return login(email, password);
};

/**
 * Login an existing user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<object>} - User data and tokens
 */
export const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });

    // Backend returns: { message, user, tokens: { accessToken, refreshToken } }
    if (data.tokens?.accessToken) {
        setTokens(data.tokens.accessToken, data.tokens.refreshToken);
        localStorage.setItem('travelmaps:user', JSON.stringify(data.user));
    }

    return {
        user: data.user,
        accessToken: data.tokens?.accessToken,
        refreshToken: data.tokens?.refreshToken,
    };
};

/**
 * Logout the current user
 */
export const logout = () => {
    clearTokens();
    window.dispatchEvent(new CustomEvent('auth:logout'));
};

/**
 * Get the current user from localStorage
 * @returns {object|null} - User object or null
 */
export const getCurrentUser = () => {
    try {
        const token = localStorage.getItem('travelmaps:token');
        const userJson = localStorage.getItem('travelmaps:user');

        if (!token || !userJson) return null;

        return JSON.parse(userJson);
    } catch {
        return null;
    }
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
    return !!localStorage.getItem('travelmaps:token');
};

/**
 * Fetch user profile from API
 * @returns {Promise<object>} - User profile data
 */
export const getProfile = async () => {
    const data = await api.get('/users/me');
    return data;
};

export default {
    register,
    login,
    logout,
    getCurrentUser,
    isAuthenticated,
    getProfile,
};
