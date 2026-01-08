import api from './api';

/**
 * Search for users by username, email, or display name
 */
export async function searchUsers(query) {
    const response = await api.get(`/friends/search?q=${encodeURIComponent(query)}`);
    return response;
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(friendId) {
    const response = await api.post('/friends/request', { friendId });
    return response;
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(friendshipId) {
    const response = await api.put(`/friends/${friendshipId}/accept`);
    return response;
}

/**
 * Reject a friend request
 */
export async function rejectFriendRequest(friendshipId) {
    const response = await api.put(`/friends/${friendshipId}/reject`);
    return response;
}

/**
 * Remove a friend
 */
export async function removeFriend(friendshipId) {
    const response = await api.delete(`/friends/${friendshipId}`);
    return response;
}

/**
 * Get list of friends
 */
export async function getFriends() {
    const response = await api.get('/friends');
    return response;
}

/**
 * Get pending friend requests (incoming and outgoing)
 */
export async function getPendingRequests() {
    const response = await api.get('/friends/pending');
    return response;
}
