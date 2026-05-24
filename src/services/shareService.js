/**
 * Share service for TravelMaps
 * Handles sharing places with friends via visibility settings
 * 
 * Uses apiClient.js which connects to the Express backend at /api/*
 */

import { fetchApi } from './apiClient.js';

/**
 * Update a place's visibility (private, friends, public)
 * @param {string} placeId - Place ID
 * @param {string} visibility - 'private', 'friends', or 'public'
 */
export async function updatePlaceVisibility(placeId, visibility) {
    const data = await fetchApi(`/places/${placeId}`, {
        method: 'PUT',
        body: JSON.stringify({ visibility }),
    });
    return data;
}

export default {
    updatePlaceVisibility,
};
