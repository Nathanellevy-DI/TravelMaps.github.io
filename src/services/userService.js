/**
 * User service for TravelMaps
 * Handles user search and profile operations
 * 
 * Uses apiClient.js which connects to the Express backend at /api/*
 */

import { fetchApi } from './apiClient.js';

/**
 * Search for users by display name or email
 * @param {string} query - Search query
 * @returns {Promise<object[]>} - Array of users
 */
export const searchUsers = async (query) => {
    const data = await fetchApi(`/users/search?q=${encodeURIComponent(query)}`);
    return data;
};

/**
 * Get the current user's profile
 * @returns {Promise<object>} - User profile
 */
export const getProfile = async () => {
    const data = await fetchApi('/auth/me');
    return data.user;
};

export default {
    searchUsers,
    getProfile,
};
