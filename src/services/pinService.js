/**
 * Pin/Places service for TravelMaps
 * Handles CRUD operations for map pins
 */

import api from './api.js';

/**
 * Get all pins for the current user
 * @returns {Promise<object[]>} - Array of pins
 */
export const getPins = async () => {
    const data = await api.get('/pins');
    // Transform backend format to frontend format
    const pins = data.pins || data;
    return pins.map(transformPinFromBackend);
};

/**
 * Create a new pin
 * @param {object} pinData - Pin data
 * @returns {Promise<object>} - Created pin
 */
export const createPin = async (pinData) => {
    // Transform frontend format to backend format
    const payload = {
        title: pinData.name || pinData.title,
        description: pinData.description || '',
        latitude: pinData.lat || pinData.latitude,
        longitude: pinData.lon || pinData.lng || pinData.longitude,
        address: pinData.address || pinData.formatted || '',
        notes: pinData.notes || '',
        imageUrl: pinData.imageUrl,
        categoryId: pinData.categoryId,
        isPublic: pinData.isPublic || false,
    };

    const data = await api.post('/pins', payload);
    return transformPinFromBackend(data.pin || data);
};

/**
 * Update an existing pin
 * @param {string} id - Pin ID
 * @param {object} pinData - Updated pin data
 * @returns {Promise<object>} - Updated pin
 */
export const updatePin = async (id, pinData) => {
    // Transform fields to backend format
    const payload = {};
    if (pinData.name !== undefined) payload.title = pinData.name;
    if (pinData.title !== undefined) payload.title = pinData.title;
    if (pinData.description !== undefined) payload.description = pinData.description;
    if (pinData.lat !== undefined) payload.latitude = pinData.lat;
    if (pinData.lng !== undefined) payload.longitude = pinData.lng;
    if (pinData.address !== undefined) payload.address = pinData.address;
    if (pinData.notes !== undefined) payload.notes = pinData.notes;
    if (pinData.imageUrl !== undefined) payload.imageUrl = pinData.imageUrl;
    if (pinData.categoryId !== undefined) payload.categoryId = pinData.categoryId;
    if (pinData.isPublic !== undefined) payload.isPublic = pinData.isPublic;

    const data = await api.put(`/pins/${id}`, payload);
    return transformPinFromBackend(data.pin || data);
};

/**
 * Delete a pin
 * @param {string} id - Pin ID
 * @returns {Promise<void>}
 */
export const deletePin = async (id) => {
    return api.delete(`/pins/${id}`);
};

/**
 * Get public pins
 * @returns {Promise<object[]>} - Array of public pins
 */
export const getPublicPins = async () => {
    const data = await api.get('/pins/public');
    const pins = data.pins || data;
    return pins.map(transformPinFromBackend);
};

/**
 * Get pins shared with the current user
 * @returns {Promise<object>} - { sharedPins, sharedCategories }
 */
export const getSharedItems = async () => {
    const data = await api.get('/share');
    return {
        sharedPins: (data.sharedPins || []).map(transformPinFromBackend),
        sharedCategories: data.sharedCategories || [],
    };
};

/**
 * Share a pin with a user
 * @param {string} pinId - Pin ID
 * @param {string} toUserId - User ID to share with
 */
export const sharePin = async (pinId, toUserId) => {
    return api.post(`/share/pin/${pinId}`, { toUserId });
};

/**
 * Transform pin from backend format to frontend format
 */
const transformPinFromBackend = (pin) => {
    if (!pin) return null;
    return {
        id: pin.id,
        name: pin.title, // Frontend uses 'name'
        title: pin.title,
        description: pin.description,
        lat: pin.latitude, // Frontend uses 'lat'
        lng: pin.longitude, // Frontend uses 'lng'
        latitude: pin.latitude,
        longitude: pin.longitude,
        address: pin.address,
        notes: pin.notes,
        imageUrl: pin.imageUrl,
        categoryId: pin.categoryId,
        category: pin.category,
        isPublic: pin.isPublic,
        userId: pin.userId,
        createdAt: pin.createdAt,
        updatedAt: pin.updatedAt,
        // Sharing info if present
        sharedBy: pin.sharedBy,
        sharedAt: pin.sharedAt,
    };
};

export default {
    getPins,
    createPin,
    updatePin,
    deletePin,
    getPublicPins,
    getSharedItems,
    sharePin,
};
