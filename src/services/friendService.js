/**
 * Friend service for TravelMaps
 * Handles friend search, requests, and management
 * 
 * Uses apiClient.js which connects to the Express backend at /api/*
 */

import { fetchApi } from './apiClient.js';

/**
 * Search for users by display name or email
 * @param {string} query - Search query
 * @returns {Promise<object[]>} - Array of matching users
 */
export async function searchUsers(query) {
    const data = await fetchApi(`/users/search?q=${encodeURIComponent(query)}`);
    return data;
}

/**
 * Send a friend request by email or display name
 * @param {string} targetEmailOrName - Email or display name of target user
 */
export async function sendFriendRequest(targetEmailOrName) {
    const data = await fetchApi('/friends/request', {
        method: 'POST',
        body: JSON.stringify({ targetEmailOrName }),
    });
    return data;
}

/**
 * Respond to a friend request (accept or reject)
 * @param {string} friendshipId - The friendship record ID
 * @param {boolean} accept - True to accept, false to reject
 */
export async function respondToFriendRequest(friendshipId, accept) {
    const data = await fetchApi('/friends/respond', {
        method: 'POST',
        body: JSON.stringify({ friendshipId, accept }),
    });
    return data;
}

/**
 * Get list of friends and pending requests
 * @returns {Promise<object>} - { friends, pendingRequests }
 */
export async function getFriends() {
    const data = await fetchApi('/friends');
    return data;
}

export default {
    searchUsers,
    sendFriendRequest,
    respondToFriendRequest,
    getFriends,
};
