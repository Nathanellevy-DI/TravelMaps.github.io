/**
 * Category service for TravelMaps
 * Handles CRUD operations for pin categories
 */

import api from './api.js';

/**
 * Get all categories for the current user
 * @returns {Promise<object[]>} - Array of categories
 */
export const getCategories = async () => {
    const data = await api.get('/categories');
    return data.categories || data;
};

/**
 * Create a new category
 * @param {object} categoryData - Category data
 * @returns {Promise<object>} - Created category
 */
export const createCategory = async (categoryData) => {
    const data = await api.post('/categories', {
        name: categoryData.name,
        color: categoryData.color,
        icon: categoryData.icon,
        isPublic: categoryData.isPublic || false,
    });
    return data.category || data;
};

/**
 * Update an existing category
 * @param {string} id - Category ID
 * @param {object} categoryData - Updated category data
 * @returns {Promise<object>} - Updated category
 */
export const updateCategory = async (id, categoryData) => {
    const data = await api.put(`/categories/${id}`, categoryData);
    return data.category || data;
};

/**
 * Delete a category
 * @param {string} id - Category ID
 * @returns {Promise<void>}
 */
export const deleteCategory = async (id) => {
    return api.delete(`/categories/${id}`);
};

/**
 * Get public categories
 * @returns {Promise<object[]>} - Array of public categories
 */
export const getPublicCategories = async () => {
    const data = await api.get('/categories/public');
    return data.categories || data;
};

export default {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getPublicCategories,
};
