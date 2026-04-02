/**
 * User service for TravelMaps
 * Handles user search and profile operations
 */

import api from './api.js';

/**
 * Search for users by username or display name
 * @param {string} query - Search query
 * @returns {Promise<object[]>} - Array of users
 */
export const searchUsers = async (query) => {
    const data = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
    return data.users || data;
};

/**
 * Get all users (for discovery/browsing)
 * @param {number} limit - Max number of users to return
 * @returns {Promise<object[]>} - Array of users
 */
export const getAllUsers = async (limit = 50) => {
    const data = await api.get(`/users?limit=${limit}`);
    return data.users || data;
};

/**
 * Get a specific user's public profile
 * @param {string} userId - User ID
 * @returns {Promise<object>} - User profile
 */
export const getUserById = async (userId) => {
    const data = await api.get(`/users/${userId}`);
    return data.user || data;
};

/**
 * Update current user's profile
 * @param {object} profileData - Profile data to update
 * @returns {Promise<object>} - Updated user
 */
export const updateProfile = async (profileData) => {
    const data = await api.put('/users/me', profileData);
    return data.user || data;
};

export default {
    searchUsers,
    getAllUsers,
    getUserById,
    updateProfile,
};
