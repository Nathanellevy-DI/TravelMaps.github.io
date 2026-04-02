import api from './api';

/**
 * Share a pin with friends
 * @param {string} pinId 
 * @param {string[]} toUserIds 
 */
export async function sharePin(pinId, toUserIds, pinData) {
    const response = await api.post('/share/pin', { pinId, toUserIds, pinData });
    return response;
}

/**
 * Share a category with friends
 * @param {string} categoryId 
 * @param {string[]} toUserIds 
 */
export async function shareCategory(categoryId, toUserIds) {
    const response = await api.post('/share/category', { categoryId, toUserIds });
    return response;
}

/**
 * Get items shared with current user
 */
export async function getSharedItems() {
    const response = await api.get('/share/items');
    return response;
}
