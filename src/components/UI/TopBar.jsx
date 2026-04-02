/**
 * TopBar.jsx — Top Navigation & Search Bar
 *
 * The top bar sits above the map and provides:
 *   - A search input with Geoapify autocomplete suggestions
 *   - A "Save" button on each suggestion to quickly pin a location
 *   - Desktop-only action buttons: Logout, Sidebar toggle, My Location
 *
 * Search flow:
 *   1. User types in the search input (debounce after 2 chars)
 *   2. Geoapify autocomplete API returns up to 5 suggestions
 *   3. Clicking a suggestion flies the map to that location and places a temp marker
 *   4. Pressing Enter performs a geocode search and picks the top result
 *   5. Clicking "Save" on a suggestion immediately saves it as a place
 *
 * The Geoapify API key is hardcoded for simplicity (free tier).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Menu, LogOut } from 'lucide-react';
import { usePlaces } from '../../contexts/PlacesContext';
import NotificationsBell from './NotificationsBell';

// Geoapify geocoding API key (free tier, public)
const GEOAPIFY_KEY = '8dce2a1641ca4c0bac83f3feafc51bbf';

/**
 * @param {Object}   props
 * @param {Function} props.onMenuClick     — Opens the sidebar
 * @param {Function} props.onLocationClick — Flies map to user's GPS location
 * @param {Object}   props.map            — Leaflet map instance (for flyTo)
 * @param {Function} props.onSearchResult  — Callback when a search result is selected
 * @param {string}   props.user           — Display name for the logout button tooltip
 * @param {Function} props.onLogout       — Logout callback
 */
export default function TopBar({ onMenuClick, onLocationClick, map, onSearchResult, user, onLogout }) {
    // Pull addPlace from context for saving new places
    const { addPlace } = usePlaces();

    // Search input state
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef(null); // Ref for click-outside detection

    // Close suggestions dropdown when clicking outside the search area
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /**
     * Handles typing in the search input.
     * Triggers autocomplete after 2 characters.
     */
    const handleSearchInput = (e) => {
        const val = e.target.value;
        setQuery(val);
        if (!val.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Only fetch suggestions after 2+ characters to reduce API calls
        if (val.length > 2) {
            fetchAutocomplete(val);
        }
    };

    /**
     * Fetches place suggestions from the Geoapify Autocomplete API.
     *
     * @param {string} q — Search query text
     */
    const fetchAutocomplete = async (q) => {
        try {
            const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(q)}&limit=5&format=json&apiKey=${GEOAPIFY_KEY}`;
            const res = await fetch(url);
            const data = await res.json();
            setSuggestions(data.results || []);
            setShowSuggestions(true);
        } catch (err) {
            console.error('Autocomplete Error:', err);
        }
    };

    /**
     * Handles the search form submission (Enter key or search button).
     * Performs a full geocode search and flies to the first result.
     */
    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        try {
            const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&format=json&limit=1&apiKey=${GEOAPIFY_KEY}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.results && data.results.length > 0) {
                const p = data.results[0];
                if (onSearchResult) {
                    onSearchResult(p); // Pass result up to App for temp marker placement
                } else if (map) {
                    map.flyTo([p.lat, p.lon], 14); // Fallback: just fly to location
                }
            } else {
                alert('Location not found.');
            }
        } catch (err) {
            console.error("Search error", err);
        }
        setShowSuggestions(false);
    };

    /**
     * Handles clicking on a suggestion in the dropdown.
     * Updates the search input and flies the map to that location.
     */
    const handleSuggestionClick = (place) => {
        setQuery(place.formatted || place.name);
        setShowSuggestions(false);
        if (onSearchResult) {
            onSearchResult(place);
        } else if (map) {
            map.setView([place.lat, place.lon], 15);
        }
    };

    /**
     * Handles the "Save" button click on a suggestion.
     * Immediately saves the place without needing a temp marker first.
     */
    const handleSaveSuggestion = useCallback((e, place) => {
        e.stopPropagation(); // Prevent the suggestion click handler from firing
        // Generate the ID inside the event handler (not during render)
        // so the impure Date.now() call only runs on user interaction
        const placeId = 'p_' + Date.now();
        const newPlace = {
            id: placeId,
            name: place.name || place.formatted,
            lat: place.lat,
            lon: place.lon,
            formatted: place.formatted,
            memories: []
        };
        addPlace(newPlace);
        setShowSuggestions(false);
        setQuery('');
    }, [addPlace]);

    return (
        <header className="topbar map-topbar">
            {/* Search bar with autocomplete dropdown */}
            <div className="search-wrapper" ref={searchRef}>
                <form onSubmit={handleSearchSubmit} style={{ flex: 1, display: 'flex' }}>
                    <input
                        id="search"
                        type="search"
                        placeholder="Search places..."
                        autoComplete="off"
                        value={query}
                        onChange={handleSearchInput}
                    />
                    <button type="submit" className="search-btn" aria-label="Search">🔍</button>
                </form>

                {/* Autocomplete suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="results-card" style={{ display: 'block' }}>
                        {suggestions.map((r, i) => (
                            <div key={i} className="result-item" onClick={() => handleSuggestionClick(r)}>
                                <div style={{ flex: 1 }}>
                                    <div className="result-title">{r.name || r.formatted}</div>
                                    <div className="result-sub">{r.formatted}</div>
                                </div>
                                <div className="saved-actions">
                                    <button className="small-btn" onClick={(e) => handleSaveSuggestion(e, r)}>Save</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Desktop-only action buttons (hidden on mobile via CSS) */}
            <div className="desktop-buttons">
                <NotificationsBell />
                <button
                    className="secondary"
                    onClick={onLogout}
                    style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
                    title={`Logged in as ${user}`}
                >
                    <LogOut size={14} /> Logout
                </button>
                <button id="sidebarToggle" className="icon-btn" onClick={onMenuClick} aria-label="Open sidebar">
                    <Menu size={20} />
                </button>
                <button id="locationBtn" className="icon-btn" onClick={onLocationClick} aria-label="Go to my location">
                    <MapPin size={20} />
                </button>
            </div>
        </header>
    );
}
