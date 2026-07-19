/**
 * PlacesContext.jsx — IndexedDB Global State for Saved Places & Categories
 */

import { createContext, useState, useEffect, useContext, useRef, useMemo, Fragment, useCallback } from 'react';
import { useDialog } from '../hooks/useDialog.jsx';
import { useAuth } from './AuthContext';
import { getUserData, saveUserData } from '../utils/db';
import { io as socketIO } from 'socket.io-client';

const PlacesContext = createContext();

const CATEGORY_COLORS = {
    'Default': '#3ea6ff',
    'Attractions': '#ff9f43',
    'Amusement Parks': '#ff6b6b',
    'Restaurants': '#feca57',
    'Bars': '#ff9ff3',
    'Clubs': '#a29bfe',
    'Gyms': '#54a0ff',
    'Stadiums': '#00d2d3',
    'Concert Halls': '#fd79a8',
    'Homes': '#2e86de',
    'Wishlist': '#8395a7'
};

const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const getCategoryColor = (category) => {
    return CATEGORY_COLORS[category] || stringToColor(category);
};

export function PlacesProvider({ children, user }) {
    const DEFAULT_CATEGORIES = useMemo(
        () => Object.keys(CATEGORY_COLORS).filter(c => c !== 'Default'),
        []
    );

    const { showConfirm, DialogComponent } = useDialog();

    const [savedPlaces, setSavedPlaces] = useState([]);
    const [visiblePlaces, setVisiblePlaces] = useState([]);
    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
    const [isLoaded, setIsLoaded] = useState(false);
    const loadingRef = useRef(false);
    const socketRef = useRef(null);

    // Get the unique username key for IndexedDB
    const userIdKey = user ? (typeof user === 'object' ? user.id : user) : 'guest';

    // Normalize a server place object to have consistent field names
    const normalizePlaces = (serverPlaces) => {
        return serverPlaces.map(p => {
            const isOwnPlace = p.user_id === userIdKey;
            // Normalize media items: alias mime_type → type for frontend components
            const normalizedMedia = (p.media || []).map(m => ({
                ...m,
                type: m.mime_type || m.type
            }));
            return {
                ...p,
                media: normalizedMedia,
                memories: normalizedMedia, // backward compat alias
                isShared: !isOwnPlace,
                sharedBy: !isOwnPlace ? { username: p.profile?.display_name || 'Friend' } : null
            };
        });
    };

    const fetchPlaces = async () => {
        if (!user) return;
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            
            if (token) {
                const response = await fetch(`${apiUrl}/api/places`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const serverPlaces = await response.json();
                    
                    // Sync any local-only places that aren't on the server yet
                    const localData = await getUserData(userIdKey);
                    const localPlaces = localData?.savedPlaces || [];
                    const serverPlaceIds = new Set(serverPlaces.map(p => p.id));
                    const unsyncedPlaces = localPlaces.filter(p => !serverPlaceIds.has(p.id) && p.user_id === userIdKey);
                    
                    if (unsyncedPlaces.length > 0) {
                        console.log(`Syncing ${unsyncedPlaces.length} offline local places to the server...`);
                        for (const p of unsyncedPlaces) {
                            try {
                                await fetch(`${apiUrl}/api/places`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify(p)
                                });
                            } catch (err) {
                                console.error('Failed to sync place:', p.id, err);
                            }
                        }
                        
                        // Refetch to get the synced list
                        const refetchRes = await fetch(`${apiUrl}/api/places`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (refetchRes.ok) {
                            const updatedServerPlaces = await refetchRes.json();
                            const formattedPlaces = normalizePlaces(updatedServerPlaces);
                            setSavedPlaces(formattedPlaces);
                            await saveUserData(userIdKey, { ...localData, savedPlaces: formattedPlaces });
                            setIsLoaded(true);
                            return;
                        }
                    }

                    const formattedPlaces = normalizePlaces(serverPlaces);
                    setSavedPlaces(formattedPlaces);
                    
                    // Cache to IndexedDB for offline access
                    const data = await getUserData(userIdKey) || { categories: DEFAULT_CATEGORIES };
                    await saveUserData(userIdKey, { ...data, savedPlaces: formattedPlaces });
                    setIsLoaded(true);
                    return;
                }
            }
        } catch (error) {
            console.warn('Backend fetch failed, falling back to IndexedDB:', error);
        }

        try {
            const data = await getUserData(userIdKey);
            if (data) {
                setSavedPlaces(data.savedPlaces || []);
                setCategories(data.categories || DEFAULT_CATEGORIES);
            } else {
                const initialData = { savedPlaces: [], categories: DEFAULT_CATEGORIES };
                await saveUserData(userIdKey, initialData);
                setSavedPlaces([]);
                setCategories(DEFAULT_CATEGORIES);
            }
        } catch (error) {
            console.error('Error loading places:', error);
        } finally {
            setIsLoaded(true);
        }
    };

    useEffect(() => {
        if (!user || loadingRef.current) return;
        loadingRef.current = true;
        
        fetchPlaces().finally(() => {
            loadingRef.current = false;
        });
    }, [user]);

    // Socket.IO real-time sync: listen for places_update events from any device
    useEffect(() => {
        if (!user) return;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const userId = typeof user === 'object' ? user.id : user;
        const socket = socketIO(apiUrl, { query: { userId }, transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('places_update', () => {
            // Debounce: avoid rapid refetches
            if (!loadingRef.current) {
                loadingRef.current = true;
                fetchPlaces().finally(() => { loadingRef.current = false; });
            }
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user]);

    const [creationSettings, setCreationSettings] = useState({
        category: 'Default',
        color: '#3ea6ff',
        visibility: 'private' // default visibility
    });

    const [activePlaceId, setActivePlaceId] = useState(null);

    const setCategory = (newCategory) => {
        const newColor = getCategoryColor(newCategory);
        setCreationSettings(prev => ({
            ...prev,
            category: newCategory,
            color: newColor
        }));
    };

    const addCategory = async (name) => {
        let updatedCategories = categories;
        if (!categories.includes(name)) {
            updatedCategories = [...categories, name];
            setCategories(updatedCategories);
            await saveUserData(userIdKey, { savedPlaces, categories: updatedCategories });
        }
        setCategory(name);
    };

    /**
     * Ensures a locally-created place exists on the backend.
     * If the place doesn't exist in PostgreSQL (returns 404 on GET),
     * it POSTs the full place object to create it.
     * This handles places created offline or before the backend was set up.
     */
    const ensurePlaceOnBackend = async (placeId) => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const token = localStorage.getItem('travelmaps_token');
        if (!token) return;

        const place = savedPlaces.find(p => p.id === placeId);
        if (!place) return;

        try {
            // Check if place exists on backend
            const checkRes = await fetch(`${apiUrl}/api/places/${placeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (checkRes.status === 404) {
                // Place doesn't exist on backend — create it
                await fetch(`${apiUrl}/api/places`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        id: place.id,
                        lat: place.lat,
                        lon: place.lon,
                        name: place.name,
                        formatted: place.formatted || '',
                        category: place.category || 'Default',
                        color: place.color || '#3ea6ff',
                        visibility: place.visibility || 'private'
                    })
                });
                console.log('Auto-synced place to backend:', placeId);
            }
        } catch (err) {
            console.error('Failed to ensure place on backend:', err);
        }
    };

    const addPlace = async (place, overrideVisibility) => {
        const isShabbat = creationSettings.category === 'Shabbat Dinners' ||
            creationSettings.category === 'Lone Soldier Shabbat Dinners';

        const placeId = 'p_' + Date.now();
        const visibility = overrideVisibility || creationSettings.visibility;
        
        const newPlace = {
            id: placeId,
            user_id: userIdKey,
            lat: place.lat,
            lon: place.lon,
            name: place.name,
            formatted: place.formatted || '',
            category: creationSettings.category,
            color: creationSettings.color,
            visibility,
            memories: place.memories || [],
            media: place.media || [],
            requests: [],
            approvalStatus: isShabbat ? 'none' : 'approved'
        };

        // Optimistically save locally
        const updatedPlaces = [newPlace, ...savedPlaces];
        setSavedPlaces(updatedPlaces);
        try {
            const localData = await getUserData(userIdKey) || { categories: DEFAULT_CATEGORIES };
            await saveUserData(userIdKey, { ...localData, savedPlaces: updatedPlaces });
        } catch (error) {
            console.error(error);
        }

        // Save to backend
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            if (token) {
                await fetch(`${apiUrl}/api/places`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(newPlace)
                });
            }
        } catch (error) {
            console.error('Failed to save place to backend:', error);
        }
    };

    const removePlace = async (id) => {
        const confirmed = await showConfirm('Delete Place', 'Delete this saved place and all its memories?', true);
        if (confirmed) {
            // Save locally
            const updatedPlaces = savedPlaces.filter(p => p.id !== id);
            setSavedPlaces(updatedPlaces);
            try {
                const localData = await getUserData(userIdKey) || { categories: DEFAULT_CATEGORIES };
                await saveUserData(userIdKey, { ...localData, savedPlaces: updatedPlaces });
            } catch (err) {
                console.error(err);
            }

            // Save to backend
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const token = localStorage.getItem('travelmaps_token');
                if (token) {
                    await fetch(`${apiUrl}/api/places/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                }
            } catch (error) {
                console.error('Failed to delete place from backend:', error);
            }
        }
    };

    const updateVisibility = async (placeId, newVisibility) => {
        // Save locally
        const updatedPlaces = savedPlaces.map(p => p.id === placeId ? { ...p, visibility: newVisibility } : p);
        setSavedPlaces(updatedPlaces);
        try {
            const localData = await getUserData(userIdKey) || { categories: DEFAULT_CATEGORIES };
            await saveUserData(userIdKey, { ...localData, savedPlaces: updatedPlaces });
        } catch (err) {
            console.error(err);
        }

        // Save to backend (auto-create place if missing)
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            if (token) {
                await ensurePlaceOnBackend(placeId);
                const response = await fetch(`${apiUrl}/api/places/${placeId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ visibility: newVisibility })
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || 'Update failed');
                }
            }
        } catch (error) {
            console.error('Failed to update place visibility on backend:', error);
            throw error;
        }
    };

    const addMemory = async (placeId, memory) => {
        const place = getPlace(placeId);
        if (!place) return;
        const updatedMemories = [...place.memories, memory];
        
        try {
            const updatedPlaces = savedPlaces.map(p => p.id === placeId ? { ...p, memories: updatedMemories } : p);
            setSavedPlaces(updatedPlaces);
            await saveUserData(userIdKey, { savedPlaces: updatedPlaces, categories });
        } catch (err) {
            console.error(err);
        }
    };

    const removeMemory = async (placeId, memoryId) => {
        const confirmed = await showConfirm('Delete Memory', 'Delete this memory?', true);
        if (confirmed) {
            const place = getPlace(placeId);
            if (!place) return;
            const updatedMemories = place.memories.filter(m => m.id !== memoryId);

            try {
                const updatedPlaces = savedPlaces.map(p => p.id === placeId ? { ...p, memories: updatedMemories } : p);
                setSavedPlaces(updatedPlaces);
                await saveUserData(userIdKey, { savedPlaces: updatedPlaces, categories });
            } catch (err) {
                console.error(err);
            }
        }
    };

    const updatePlaceCategory = async (placeId, newCategory) => {
        const newColor = getCategoryColor(newCategory);
        try {
            const updatedPlaces = savedPlaces.map(p => p.id === placeId ? { ...p, category: newCategory, color: newColor } : p);
            setSavedPlaces(updatedPlaces);
            await saveUserData(userIdKey, { savedPlaces: updatedPlaces, categories });
        } catch (err) {
            console.error(err);
        }

        // Sync to backend
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            if (token) {
                await fetch(`${apiUrl}/api/places/${placeId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ category: newCategory, color: newColor })
                });
            }
        } catch (error) {
            console.error('Failed to sync category to backend:', error);
        }
    };

    /**
     * Generic place update — updates any whitelisted field on the backend.
     * Used for notes, youtube_url, collaborative, etc.
     */
    const updatePlace = async (placeId, updates) => {
        // Update locally
        const updatedPlaces = savedPlaces.map(p => p.id === placeId ? { ...p, ...updates } : p);
        setSavedPlaces(updatedPlaces);
        try {
            const localData = await getUserData(userIdKey) || { categories: DEFAULT_CATEGORIES };
            await saveUserData(userIdKey, { ...localData, savedPlaces: updatedPlaces });
        } catch (err) {
            console.error(err);
        }

        // Sync to backend (auto-create place if missing)
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            if (token) {
                await ensurePlaceOnBackend(placeId);
                const response = await fetch(`${apiUrl}/api/places/${placeId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updates)
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || 'Update failed');
                }
            }
        } catch (error) {
            console.error('Failed to update place on backend:', error);
            throw error;
        }
    };

    const clearAll = async () => {
        try {
            setSavedPlaces([]);
            await saveUserData(userIdKey, { savedPlaces: [], categories });
        } catch (err) {
            console.error(err);
        }
    };

    const restoreData = async (places, cats) => {
        try {
            setSavedPlaces(places || []);
            if (cats && cats.length > 0) {
                setCategories(cats);
            }
            await saveUserData(userIdKey, { savedPlaces: places || [], categories: cats || categories });
        } catch (err) {
            console.error(err);
        }
    };

    const getPlace = (id) => savedPlaces.find(p => p.id === id);

    const submitRequest = async (placeId, request) => {
        try {
            const updatedPlaces = savedPlaces.map(p => {
                if (p.id === placeId) {
                    return {
                        ...p,
                        approvalStatus: 'pending',
                        requests: [...(p.requests || []), request]
                    };
                }
                return p;
            });
            setSavedPlaces(updatedPlaces);
            await saveUserData(userIdKey, { savedPlaces: updatedPlaces, categories });
        } catch (err) {
            console.error(err);
        }
    };

    const approvePlace = async (placeId) => {
        try {
            const updatedPlaces = savedPlaces.map(p => {
                if (p.id === placeId) {
                    return {
                        ...p,
                        approvalStatus: 'approved'
                    };
                }
                return p;
            });
            setSavedPlaces(updatedPlaces);
            await saveUserData(userIdKey, { savedPlaces: updatedPlaces, categories });
        } catch (err) {
            console.error(err);
        }
    };

    const refreshPlaces = async () => {
        await fetchPlaces();
    };

    const removeMedia = async (placeId, mediaId) => {
        const confirmed = await showConfirm('Delete Item', 'Are you sure you want to delete this memory?', true);
        if (confirmed) {
            // Save locally
            const updatedPlaces = savedPlaces.map(p => {
                if (p.id === placeId) {
                    return {
                        ...p,
                        media: (p.media || []).filter(m => m.id !== mediaId)
                    };
                }
                return p;
            });
            setSavedPlaces(updatedPlaces);
            try {
                const localData = await getUserData(userIdKey) || { categories: DEFAULT_CATEGORIES };
                await saveUserData(userIdKey, { ...localData, savedPlaces: updatedPlaces });
            } catch (err) {
                console.error(err);
            }

            // Save to backend
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const token = localStorage.getItem('travelmaps_token');
                if (token) {
                    await fetch(`${apiUrl}/api/media/${mediaId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                }
            } catch (error) {
                console.error('Failed to delete media from backend:', error);
            }
        }
    };

    const uploadMedia = async (placeId, file, tier, sharedWith = []) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            
            // Ensure the place exists on the backend before uploading media
            await ensurePlaceOnBackend(placeId);
            
            const formData = new FormData();
            formData.append('media', file);
            formData.append('placeId', placeId);
            formData.append('tier', tier);
            formData.append('sharedWith', JSON.stringify(sharedWith));

            const response = await fetch(`${apiUrl}/api/media/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Upload failed (${response.status})`);
            }

            const result = await response.json();
            await fetchPlaces(); // Refresh to sync
            return { success: true, mediaId: result.mediaId };
        } catch (err) {
            console.error('Error uploading media:', err);
            throw err;
        }
    };

    const addTextNote = async (placeId, noteText, tier = 3) => {
        try {
            const file = new File([noteText], 'Note.txt', { type: 'text/plain' });
            return await uploadMedia(placeId, file, tier);
        } catch (err) {
            console.error('Error adding text note:', err);
            return { error: err.message };
        }
    };

    const fetchVisiblePlaces = async (lat, lon, radiusKm = 25) => {
        if (!user) return [];
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            if (token) {
                let url = `${apiUrl}/api/places/visible?radiusKm=${radiusKm}`;
                if (lat !== null && lon !== null && lat !== undefined && lon !== undefined) {
                    url += `&lat=${lat}&lon=${lon}`;
                }
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    const formatted = normalizePlaces(data);
                    setVisiblePlaces(formatted);
                    return formatted;
                }
            }
        } catch (err) {
            console.error('Failed to fetch visible places:', err);
        }
        return [];
    };

    const sharePlace = async (placeId, { visibility, sharedWithUserIds = [], groupId = null, collaborative = false }) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            if (token) {
                await ensurePlaceOnBackend(placeId);
                await updatePlace(placeId, { collaborative });

                const response = await fetch(`${apiUrl}/api/places/${placeId}/share`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ visibility, sharedWithUserIds, groupId })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || 'Share failed');
                }
                
                // Refresh local places
                await fetchPlaces();
            }
        } catch (err) {
            console.error('Error sharing place:', err);
            throw err;
        }
    };

    return (
        <Fragment>
            <PlacesContext.Provider value={{
                savedPlaces,
                visiblePlaces,
                fetchVisiblePlaces,
                sharePlace,
                addPlace,
                removePlace,
                activePlaceId,
                setActivePlaceId,
                addMemory,
                removeMemory,
                getPlace,
                categories,
                addCategory,
                creationSettings,
                setCreationSettings,
                setCategory,
                updatePlaceCategory,
                updateVisibility,
                updatePlace,
                clearAll,
                restoreData,
                submitRequest,
                approvePlace,
                refreshPlaces,
                uploadMedia,
                addTextNote,
                removeMedia
            }}>
                {children}
            </PlacesContext.Provider>
            {DialogComponent}
        </Fragment>
    );
}

export function usePlaces() {
    return useContext(PlacesContext);
}

export default PlacesContext;
