/**
 * Authentication service for TravelMaps
 * Handles user registration, login, and session management
 * 
 * Uses apiClient.js which connects to the Express backend at /api/*
 */

import { fetchApi, getToken, setToken } from './apiClient.js';

/**
 * Register a new user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} name - User's display name
 * @returns {Promise<object>} - User data and token
 */
export const register = async (email, password, name) => {
    const data = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, display_name: name }),
    });

    if (data.token) {
        setToken(data.token);
    }

    return { user: data.user, token: data.token };
};

/**
 * Login an existing user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<object>} - User data and token
 */
export const login = async (email, password) => {
    const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    if (data.token) {
        setToken(data.token);
    }

    return { user: data.user, token: data.token };
};

/**
 * Logout the current user
 */
export const logout = () => {
    setToken(null);
};

/**
 * Get the current user from the server
 * @returns {Promise<object|null>} - User object or null
 */
export const getCurrentUser = async () => {
    const token = getToken();
    if (!token) return null;

    try {
        const data = await fetchApi('/auth/me');
        return data.user;
    } catch {
        return null;
    }
};

/**
 * Check if user is authenticated (has a token)
 * @returns {boolean}
 */
export const isAuthenticated = () => {
    return !!getToken();
};

export default {
    register,
    login,
    logout,
    getCurrentUser,
    isAuthenticated,
};
