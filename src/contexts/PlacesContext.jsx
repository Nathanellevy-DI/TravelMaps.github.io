import { createContext, useState, useEffect, useContext, useRef, Fragment } from 'react';
import { getUserData, saveUserData } from '../utils/db';
import { useDialog } from '../hooks/useDialog.jsx';

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
                const userData = await getUserData(user);
                if (userData) {
                    setSavedPlaces(userData.savedPlaces.map(p => ({
                        ...p,
                        memories: p.memories || [],
                        category: p.category || 'Default',
                        color: p.color || getCategoryColor(p.category || 'Default'),
                        requests: p.requests || [],
                        approvalStatus: p.approvalStatus || (
                            (p.category === 'Shabbat Dinners' || p.category === 'Lone Soldier Shabbat Dinners') ? 'none' : 'approved'
                        )
                    })));
                    setCategories(userData.categories || DEFAULT_CATEGORIES);
                } else {
                    setSavedPlaces([]);
                    setCategories(DEFAULT_CATEGORIES);
                }
                setIsLoaded(true);
            } catch (e) {
                console.error('Error loading data from IndexedDB:', e);
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
                await saveUserData(user, { savedPlaces, categories });
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

    const clearAll = async () => {
        const confirmed = await showConfirm('Clear All Places', 'Are you sure you want to clear all saved places?', true);
        if (confirmed) {
            setSavedPlaces([]);
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
                approvePlace
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
