/**
 * PlacesContext.jsx — Supabase Global State for Saved Places & Categories
 */

import { createContext, useState, useEffect, useContext, useRef, useMemo, Fragment } from 'react';
import { useDialog } from '../hooks/useDialog.jsx';
import { fetchApi } from '../services/apiClient';
import { useAuth } from './AuthContext';
import { useSocial } from './SocialContext';

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
    const { friends } = useSocial(); // To trigger re-fetch if friendship changes could mean more places viewable

    const [savedPlaces, setSavedPlaces] = useState([]);
    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
    const [isLoaded, setIsLoaded] = useState(false);
    const loadingRef = useRef(false);

    const fetchPlaces = async () => {
        if (!user) return;
        try {
            // Policies will automatically restrict what we can see to:
            // 1. our own places
            // 2. public places
            // 3. friends' places that are shared with friends
            const data = await fetchApi('/places');
            setSavedPlaces(data);
            setIsLoaded(true);
        } catch (error) {
            console.error('Error loading places:', error);
            setIsLoaded(true);
        }
    };

    useEffect(() => {
        if (!user || loadingRef.current) return;
        loadingRef.current = true;
        
        fetchPlaces().finally(() => {
            loadingRef.current = false;
        });

        // WebSockets will be handled in SocialContext for simplicity, 
        // or we could just add socket.io here if needed.
        // For now, SocialContext's refresh will trigger if needed, or we rely on optimistic updates.
    }, [user, friends]);

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

    const addCategory = (name) => {
        if (!categories.includes(name)) {
            setCategories(prev => [...prev, name]);
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
            user_id: user.id,
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

        try {
            await fetchApi('/places', {
                method: 'POST',
                body: JSON.stringify(newPlace)
            });
            // Optimistic update
            setSavedPlaces(prev => [newPlace, ...prev]);
        } catch (error) {
            alert('Failed to save place: ' + error.message);
        }
    };

    const removePlace = async (id) => {
        const confirmed = await showConfirm('Delete Place', 'Delete this saved place and all its memories?', true);
        if (confirmed) {
            try {
                await fetchApi(`/places/${id}`, { method: 'DELETE' });
                setSavedPlaces(prev => prev.filter(p => p.id !== id));
            } catch (err) {
                console.error(err);
            }
        }
    };

    const updateVisibility = async (placeId, newVisibility) => {
        try {
            await fetchApi(`/places/${placeId}`, {
                method: 'PUT',
                body: JSON.stringify({ visibility: newVisibility })
            });
            setSavedPlaces(prev => prev.map(p => p.id === placeId ? { ...p, visibility: newVisibility } : p));
        } catch (err) {
            console.error(err);
        }
    }

    const addMemory = async (placeId, memory) => {
        const place = getPlace(placeId);
        if (!place) return;
        const updatedMemories = [...place.memories, memory];
        
        try {
            await fetchApi(`/places/${placeId}`, {
                method: 'PUT',
                body: JSON.stringify({ memories: updatedMemories })
            });
            setSavedPlaces(prev => prev.map(p => p.id === placeId ? { ...p, memories: updatedMemories } : p));
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
                await fetchApi(`/places/${placeId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ memories: updatedMemories })
                });
                setSavedPlaces(prev => prev.map(p => p.id === placeId ? { ...p, memories: updatedMemories } : p));
            } catch (err) {
                console.error(err);
            }
        }
    };

    const updatePlaceCategory = async (placeId, newCategory) => {
        const newColor = getCategoryColor(newCategory);
        try {
            await fetchApi(`/places/${placeId}`, {
                method: 'PUT',
                body: JSON.stringify({ category: newCategory, color: newColor })
            });
            setSavedPlaces(prev => prev.map(p => p.id === placeId ? { ...p, category: newCategory, color: newColor } : p));
        } catch (err) {
            console.error(err);
        }
    };

    const getPlace = (id) => savedPlaces.find(p => p.id === id);

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
                updateVisibility
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
