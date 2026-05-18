const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// We get the token from localStorage
export const getToken = () => localStorage.getItem('travelmaps_token');

export const setToken = (token) => {
    if (token) {
        localStorage.setItem('travelmaps_token', token);
    } else {
        localStorage.removeItem('travelmaps_token');
    }
};

export const fetchApi = async (endpoint, options = {}) => {
    const token = getToken();
    const headers = {
        ...options.headers,
    };
    
    // Only set Content-Type to application/json if it's not FormData
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(data?.error || response.statusText || 'API Error');
    }

    return data;
};

export const uploadMedia = async (file, placeId, tier, sharedWithArray) => {
    const formData = new FormData();
    formData.append('media', file);
    if (placeId) formData.append('placeId', placeId);
    formData.append('tier', tier);
    if (sharedWithArray && sharedWithArray.length > 0) {
        formData.append('sharedWith', JSON.stringify(sharedWithArray));
    }
    
    return await fetchApi('/media/upload', {
        method: 'POST',
        body: formData
    });
};

export const getMediaUrl = (mediaId) => {
    return `${API_URL}/media/${mediaId}`;
};

export { SOCKET_URL };
