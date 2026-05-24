/**
 * Pin/Places service for TravelMaps
 * Handles CRUD operations for map places
 * 
 * Uses apiClient.js which connects to the Express backend at /api/*
 */

import { fetchApi } from './apiClient.js';

/**
 * Get all places visible to the current user
 * @returns {Promise<object[]>} - Array of places
 */
export const getPlaces = async () => {
    const data = await fetchApi('/places');
    return data;
};

/**
 * Create a new place
 * @param {object} placeData - Place data
 * @returns {Promise<object>} - Created place
 */
export const createPlace = async (placeData) => {
    const data = await fetchApi('/places', {
        method: 'POST',
        body: JSON.stringify(placeData),
    });
    return data;
};

/**
 * Update an existing place
 * @param {string} id - Place ID
 * @param {object} updates - Updated fields
 * @returns {Promise<object>} - Response
 */
export const updatePlace = async (id, updates) => {
    const data = await fetchApi(`/places/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
    return data;
};

/**
 * Delete a place
 * @param {string} id - Place ID
 * @returns {Promise<object>} - Response
 */
export const deletePlace = async (id) => {
    const data = await fetchApi(`/places/${id}`, {
        method: 'DELETE',
    });
    return data;
};

export default {
    getPlaces,
    createPlace,
    updatePlace,
    deletePlace,
};
