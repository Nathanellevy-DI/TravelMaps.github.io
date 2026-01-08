import { createContext, useState, useEffect, useContext, useRef, Fragment } from 'react';
import { getUserData, saveUserData } from '../utils/db';

import { useDialog } from '../hooks/useDialog.jsx';
import * as shareService from '../services/shareService';

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

// Deterministic hash for custom categories
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
    const DEFAULT_CATEGORIES = Object.keys(CATEGORY_COLORS).filter(c => c !== 'Default');
    const { showConfirm, DialogComponent } = useDialog();

    const [savedPlaces, setSavedPlaces] = useState([]);
    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
    const [isLoaded, setIsLoaded] = useState(false);
    const loadingRef = useRef(false);

    // Load data from IndexedDB
    useEffect(() => {
        if (!user || loadingRef.current) return;
        loadingRef.current = true;

        const loadData = async () => {
            try {
                // 1. Load local data
                let localPlaces = [];
                // Extract key for DB (user is now object, but DB expects string ID)
                const dbKey = (typeof user === 'object' && user !== null) ? user.id : user;

                const userData = await getUserData(dbKey);
                if (userData) {
                    localPlaces = userData.savedPlaces.map(p => ({
                        ...p,
                        memories: p.memories || [],
                        category: p.category || 'Default',
                        color: p.color || getCategoryColor(p.category || 'Default'),
                        requests: p.requests || [],
                        approvalStatus: p.approvalStatus || (
                            (p.category === 'Shabbat Dinners' || p.category === 'Lone Soldier Shabbat Dinners') ? 'none' : 'approved'
                        )
                    }));
                    setCategories(userData.categories || DEFAULT_CATEGORIES);
                } else {
                    setCategories(DEFAULT_CATEGORIES);
                }

                // 2. Fetch shared items if user is logged in
                let sharedPlaces = [];
                if (user) { // Rely on api.js to handle token from localStorage
                    try {
                        const sharedResult = await shareService.getSharedItems();
                        sharedPlaces = (sharedResult.pins || []).map(shareItem => ({
                            id: shareItem.pin.id,
                            name: shareItem.pin.title,
                            formatted: shareItem.pin.address,
                            lat: shareItem.pin.latitude,
                            lon: shareItem.pin.longitude,
                            notes: shareItem.pin.notes,
                            category: 'Shared',
                            color: '#e056fd',
                            isShared: true,
                            sharedBy: shareItem.fromUser,
                            memories: []
                        }));

                        // Add 'Shared' to categories if not present
                        setCategories(prev => {
                            if (!prev.includes('Shared')) return [...prev, 'Shared'];
                            return prev;
                        });
                    } catch (err) {
                        console.error('Failed to fetch shared items:', err);
                    }
                }

                // 3. Merge (avoid duplicates if any)
                // We prioritize shared places or local? 
                // Let's just append. IDs should be different (UUIDs vs potentially others, but likely UUIDs too).
                // If a shared place was saved locally before, we might have duplicates. 
                // Let's filter localPlaces to ensure no ID conflict with sharedPlaces.
                const sharedIds = new Set(sharedPlaces.map(p => p.id));
                const uniqueLocal = localPlaces.filter(p => !sharedIds.has(p.id));

                setSavedPlaces([...uniqueLocal, ...sharedPlaces]);
                setIsLoaded(true);
            } catch (e) {
                console.error('Error loading data:', e);
                setSavedPlaces([]);
                setCategories(DEFAULT_CATEGORIES);
                setIsLoaded(true);
            } finally {
                loadingRef.current = false;
            }
        };

        loadData();
    }, [user]);

    // Save data to IndexedDB
    useEffect(() => {
        if (!user || !isLoaded) return;

        const saveData = async () => {
            try {
                // Filter out shared items before saving to local database
                const localSavedPlaces = savedPlaces.filter(p => !p.isShared);
                const dbKey = (typeof user === 'object' && user !== null) ? user.id : user;
                await saveUserData(dbKey, { savedPlaces: localSavedPlaces, categories });
            } catch (e) {
                console.error('Error saving data to IndexedDB:', e);
            }
        };

        const timeoutId = setTimeout(saveData, 500); // Debounce save
        return () => clearTimeout(timeoutId);
    }, [savedPlaces, categories, user, isLoaded]);

    // Initialize with Default color logic
    const [creationSettings, setCreationSettings] = useState({
        category: 'Default',
        color: '#3ea6ff'
    });

    const [activePlaceId, setActivePlaceId] = useState(null);

    // When category changes, auto-update color
    const setCategory = (newCategory) => {
        const newColor = getCategoryColor(newCategory);
        setCreationSettings({
            category: newCategory,
            color: newColor
        });
    };

    const addCategory = (name) => {
        if (!categories.includes(name)) {
            setCategories(prev => [...prev, name]);
        }
        // Auto-select the new category
        setCategory(name);
    };

    const addPlace = (place) => {
        const isShabbat = creationSettings.category === 'Shabbat Dinners' ||
            creationSettings.category === 'Lone Soldier Shabbat Dinners';

        const newPlace = {
            ...place,
            category: creationSettings.category,
            color: creationSettings.color, // Auto-determined color
            requests: [],
            approvalStatus: isShabbat ? 'none' : 'approved'
        };

        setSavedPlaces(prev => {
            const isDuplicate = prev.some(sp =>
                sp.formatted === newPlace.formatted ||
                (Math.abs(sp.lat - newPlace.lat) < 0.0001 && Math.abs(sp.lon - newPlace.lon) < 0.0001)
            );

            if (isDuplicate) {
                alert('This location is already saved.');
                return prev;
            }

            return [newPlace, ...prev];
        });
    };

    const removePlace = async (id) => {
        const confirmed = await showConfirm('Delete Place', 'Delete this saved place and all its memories?', true);
        if (confirmed) {
            setSavedPlaces(prev => prev.filter(p => p.id !== id));
        }
    };

    const addMemory = (placeId, memory) => {
        setSavedPlaces(prev => prev.map(p => {
            if (p.id === placeId) {
                return { ...p, memories: [...p.memories, memory] };
            }
            return p;
        }));
    };

    const removeMemory = async (placeId, memoryId) => {
        const confirmed = await showConfirm('Delete Memory', 'Delete this memory?', true);
        if (confirmed) {
            setSavedPlaces(prev => prev.map(p => {
                if (p.id === placeId) {
                    return { ...p, memories: p.memories.filter(m => m.id !== memoryId) };
                }
                return p;
            }));
        }
    };



    const submitRequest = (placeId, request) => {
        setSavedPlaces(prev => prev.map(p => {
            if (p.id === placeId) {
                const requests = p.requests || [];
                return {
                    ...p,
                    requests: [...requests, request],
                    approvalStatus: 'pending'
                };
            }
            return p;
        }));
    };

    const approvePlace = (placeId) => {
        setSavedPlaces(prev => prev.map(p => {
            if (p.id === placeId) {
                return { ...p, approvalStatus: 'approved' };
            }
            return p;
        }));
    };

    const updatePlaceCategory = (placeId, newCategory) => {
        const newColor = getCategoryColor(newCategory);
        const isShabbat = newCategory === 'Shabbat Dinners' || newCategory === 'Lone Soldier Shabbat Dinners';

        setSavedPlaces(prev => prev.map(p => {
            if (p.id === placeId) {
                // If switching to a restricted category and currently approved, 
                // we might want to keep it approved if it's the owner? 
                // But for now, let's follow the general logic: restricted categories start as 'none'
                // unless it was already approved (which it might be if they are editing their own pin).
                // Actually, the current logic is that restricted categories start as 'none' when added.
                // If they edit it, we should probably maintain approval if it's already approved,
                // OR reset if it's a "promotion" to restricted.
                // Given the context of the app, let's just update category and color.

                let newApprovalStatus = p.approvalStatus;
                if (isShabbat && p.approvalStatus === 'approved' && !p.category.includes('Shabbat')) {
                    // If moving from non-shabbat to shabbat, reset approval? 
                    // Probably safer to just keep it approved if they were the ones who saved it.
                }

                return {
                    ...p,
                    category: newCategory,
                    color: newColor
                };
            }
            return p;
        }));
    };

    const clearAll = async () => {
        const confirmed = await showConfirm('Clear All Places', 'Are you sure you want to clear all saved places?', true);
        if (confirmed) {
            setSavedPlaces([]);
        }
    };

    const restoreData = (places, categories) => {
        setSavedPlaces(places);
        if (categories && categories.length > 0) {
            setCategories(categories);
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
                clearAll,
                getPlace,
                categories,
                addCategory,
                creationSettings,
                setCategory, // Exposed instead of setCreationSettings key
                submitRequest,
                approvePlace,
                updatePlaceCategory,
                restoreData
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
