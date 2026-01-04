import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Download, Trash2, Menu, LogOut } from 'lucide-react';
import { usePlaces } from '../../contexts/PlacesContext';

const GEOAPIFY_KEY = '8dce2a1641ca4c0bac83f3feafc51bbf';

export default function TopBar({ onMenuClick, onLocationClick, map, onSearchResult, user, onLogout }) {
    const { addPlace, savedPlaces, removePlace, clearAll } = usePlaces();
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchInput = (e) => {
        const val = e.target.value;
        setQuery(val);
        if (!val.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Debounce in a real app, keeping simple here for parity
        if (val.length > 2) {
            fetchAutocomplete(val);
        }
    };

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

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        // Perform search (taking first result)
        try {
            const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&format=json&limit=1&apiKey=${GEOAPIFY_KEY}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.results && data.results.length > 0) {
                const p = data.results[0];
                if (onSearchResult) {
                    onSearchResult(p);
                } else if (map) {
                    map.flyTo([p.lat, p.lon], 14);
                }
            } else {
                alert('Location not found.');
            }
        } catch (err) {
            console.error("Search error", err);
        }
        setShowSuggestions(false);
    };

    const handleSuggestionClick = (place) => {
        setQuery(place.formatted || place.name);
        setShowSuggestions(false);
        if (onSearchResult) {
            onSearchResult(place);
        } else if (map) {
            map.setView([place.lat, place.lon], 15);
        }
    };

    const handleSaveSuggestion = (e, place) => {
        e.stopPropagation();
        const newPlace = {
            id: 'p_' + Date.now(),
            name: place.name || place.formatted,
            lat: place.lat,
            lon: place.lon,
            formatted: place.formatted,
            memories: []
        };
        addPlace(newPlace);
        setShowSuggestions(false);
        setQuery('');
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(savedPlaces, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'saved_places.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClearAll = () => {
        clearAll();
    };

    return (
        <header className="topbar map-topbar">
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

            <div className="desktop-buttons">
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
                <button id="exportBtn" className="secondary" onClick={handleExport} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Download size={14} /> Export
                </button>
                <button id="clearAllBtn" className="danger" onClick={handleClearAll} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Trash2 size={14} /> Clear All
                </button>
            </div>
        </header>
    );
}
