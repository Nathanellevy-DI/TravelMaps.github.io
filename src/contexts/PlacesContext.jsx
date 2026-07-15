/**
 * PlacesContext.jsx — IndexedDB Global State for Saved Places & Categories
 */

import { createContext, useState, useEffect, useContext, useRef, useMemo, Fragment } from 'react';
import { useDialog } from '../hooks/useDialog.jsx';
import { useAuth } from './AuthContext';
import { getUserData, saveUserData } from '../utils/db';

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
    'Wishlist': '#8395a7',
    'Shabbat Dinners': '#f1c40f',
    'Lone Soldier Shabbat Dinners': '#10ac84'
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
    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
    const [isLoaded, setIsLoaded] = useState(false);
    const loadingRef = useRef(false);

    // Get the unique username key for IndexedDB
    const userIdKey = user ? (typeof user === 'object' ? user.id : user) : 'guest';

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
                    setSavedPlaces(serverPlaces);
                    
                    // Cache to IndexedDB for offline access
                    const data = await getUserData(userIdKey) || { categories: DEFAULT_CATEGORIES };
                    await saveUserData(userIdKey, { ...data, savedPlaces: serverPlaces });
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

        // Save to backend
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
                    body: JSON.stringify({ visibility: newVisibility })
                });
            }
        } catch (error) {
            console.error('Failed to update place visibility on backend:', error);
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

    const uploadMedia = async (placeId, file, tier) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            
            const formData = new FormData();
            formData.append('media', file);
            formData.append('placeId', placeId);
            formData.append('tier', tier);

            const response = await fetch(`${apiUrl}/api/media/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to upload file');
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

    return (
        <Fragment>
            <PlacesContext.Provider value={{
                savedPlaces,
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
