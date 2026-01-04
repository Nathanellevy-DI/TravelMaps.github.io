import { useState } from 'react';
import { X, Camera, MapPin, Trash2, Filter } from 'lucide-react';
import { usePlaces } from '../../contexts/PlacesContext';

export default function Sidebar({ isOpen, onClose, map }) {
    const { savedPlaces, removePlace, categories } = usePlaces();
    const [filterCategory, setFilterCategory] = useState('All');

    const handleGoTo = (place) => {
        if (map) {
            map.setView([place.lat, place.lon], 15);
        }
    };

    const handleOpenDetails = (placeId) => {
        document.dispatchEvent(new CustomEvent('openDetails', { detail: placeId }));
    };

    const filteredPlaces = filterCategory === 'All'
        ? savedPlaces
        : savedPlaces.filter(p => p.category === filterCategory);

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
            <div className="sidebar-header">
                <h3>Saved Places</h3>
                <button className="icon-btn" onClick={onClose} aria-label="Close">
                    <X size={20} />
                </button>
            </div>

            <div className="category-filter-wrapper" style={{ padding: '0 16px 12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                    <Filter size={14} />
                    Filter by:
                </label>
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{
                        width: '100%',
                        marginTop: '8px',
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    <option value="All">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            <div className="saved-list" id="savedList">
                {filteredPlaces.length === 0 ? (
                    <div className="result-sub" style={{ padding: '12px' }}>
                        {savedPlaces.length === 0 ? 'No saved places yet.' : 'No places found in this category.'}
                    </div>
                ) : (
                    filteredPlaces.map(place => (
                        <div key={place.id} className="saved-card" style={{ borderLeft: `4px solid ${place.color || '#3ea6ff'}` }}>
                            <div className="saved-left">
                                <div className="saved-title">{place.name || place.formatted || 'Place'}</div>
                                <div className="saved-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="badge" style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                        color: place.color || '#white'
                                    }}>
                                        {place.category || 'Default'}
                                    </span>
                                </div>
                                <div className="saved-sub">
                                    {place.formatted || `${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`} • {place.memories.length} memories
                                </div>
                            </div>
                            <div className="saved-actions">
                                <button className="small-btn" title="Details" onClick={() => handleOpenDetails(place.id)}>
                                    <Camera size={14} />
                                </button>
                                <button className="small-btn" title="Go" onClick={() => handleGoTo(place)}>
                                    <MapPin size={14} />
                                </button>
                                <button className="small-btn" title="Delete" onClick={() => removePlace(place.id)}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </aside>
    );
}
