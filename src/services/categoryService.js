/**
 * Category service for TravelMaps
 * Handles CRUD operations for pin categories
 */

import { fetchApi } from './apiClient.js';

/**
 * Get all categories for the current user
 * Note: Categories are currently managed client-side in PlacesContext.
 * This service is a placeholder for future server-side category management.
 */
export const getCategories = async () => {
    // No server endpoint for categories yet — managed in PlacesContext
    return [];
};

export const createCategory = async (categoryData) => {
    // Placeholder — categories are client-side for now
    return categoryData;
};

export const updateCategory = async (id, categoryData) => {
    return categoryData;
};

export const deleteCategory = async (id) => {
    return { success: true };
};

export const getPublicCategories = async () => {
    return [];
};

export default {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getPublicCategories,
};
