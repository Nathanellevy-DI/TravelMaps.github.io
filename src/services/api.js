/**
 * Base API service for TravelMaps backend
 * Handles all HTTP requests with JWT authentication
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

// Token management
const getToken = () => localStorage.getItem('travelmaps:token');
const getRefreshToken = () => localStorage.getItem('travelmaps:refreshToken');
const setTokens = (accessToken, refreshToken) => {
    localStorage.setItem('travelmaps:token', accessToken);
    if (refreshToken) {
        localStorage.setItem('travelmaps:refreshToken', refreshToken);
    }
};
const clearTokens = () => {
    localStorage.removeItem('travelmaps:token');
    localStorage.removeItem('travelmaps:refreshToken');
    localStorage.removeItem('travelmaps:user');
};

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/auth/login')
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - Response data
 */
export const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add auth token if available
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Handle 401 Unauthorized - try to refresh token
        if (response.status === 401 && !options._retry) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                // Retry the original request with new token
                return apiRequest(endpoint, { ...options, _retry: true });
            } else {
                // Refresh failed, clear tokens and redirect to login
                clearTokens();
                window.dispatchEvent(new CustomEvent('auth:logout'));
                throw new Error('Session expired. Please login again.');
            }
        }

        // Parse response
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
        }

        return data;
    } catch (error) {
        if (error.message === 'Failed to fetch') {
            throw new Error('Unable to connect to server. Please check if the backend is running.');
        }
        throw error;
    }
};

/**
 * Attempt to refresh the access token
 * @returns {Promise<boolean>} - True if refresh successful
 */
const refreshAccessToken = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) return false;

        const data = await response.json();
        setTokens(data.accessToken, data.refreshToken);
        return true;
    } catch {
        return false;
    }
};

// Convenience methods
export const api = {
    get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),

    post: (endpoint, body) => apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    }),

    put: (endpoint, body) => apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body),
    }),

    patch: (endpoint, body) => apiRequest(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(body),
    }),

    delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};

export { getToken, setTokens, clearTokens };
export default api;
