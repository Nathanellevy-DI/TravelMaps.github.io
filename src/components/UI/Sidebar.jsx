import { useState } from 'react';
import { X, Camera, MapPin, Trash2, Filter, Sun, Moon, Download, Upload } from 'lucide-react';
import { usePlaces } from '../../contexts/PlacesContext';
import { exportBackup, importBackup } from '../../utils/backup';

export default function Sidebar({ isOpen, onClose, map, theme, toggleTheme, user }) {
    const { savedPlaces, removePlace, clearAll, categories, restoreData } = usePlaces();
    const [filterCategory, setFilterCategory] = useState('All');

    const handleGoTo = (place) => {
        if (map) {
            map.setView([place.lat, place.lon], 15);
        }
    };

    const handleOpenDetails = (placeId) => {
        document.dispatchEvent(new CustomEvent('openDetails', { detail: placeId }));
    };

    const handleBackup = async () => {
        try {
            await exportBackup(savedPlaces, user?.name || user?.email || 'Guest', categories);
        } catch (error) {
            alert('Export failed: ' + error.message);
        }
    };

    const handleRestoreClick = () => {
        document.getElementById('restore-input').click();
    };

    const handleRestoreFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!window.confirm('This will replace your current places with the data from the backup. Continue?')) {
            e.target.value = '';
            return;
        }

        const result = await importBackup(file);
        if (result.success) {
            restoreData(result.places, result.categories);
            alert('Backup restored successfully!');
        } else {
            alert('Restore failed: ' + result.error);
        }
        e.target.value = '';
    };

    const filteredPlaces = filterCategory === 'All'
        ? savedPlaces
        : savedPlaces.filter(p => p.category === filterCategory);

    return (
        <>
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
            <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
                <div className="sidebar-header">
                    <h3>Saved Places</h3>
                    <button className="icon-btn" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="category-filter-wrapper" style={{ padding: '0 16px 12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-sub)' }}>
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
                            backgroundColor: 'var(--input-bg)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border)'
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
                                            backgroundColor: 'var(--input-bg)',
                                            color: place.color || 'var(--text-main)'
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
                <div className="sidebar-footer" style={{ padding: '12px', gap: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto' }}>
                    <button
                        className="secondary"
                        onClick={handleBackup}
                        style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', padding: '10px', fontSize: '13px' }}
                    >
                        <Download size={14} /> Backup
                    </button>
                    <button
                        className="secondary"
                        onClick={toggleTheme}
                        style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', padding: '10px', fontSize: '13px' }}
                    >
                        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button
                        className="secondary"
                        onClick={handleRestoreClick}
                        style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', padding: '10px', fontSize: '13px' }}
                    >
                        <Upload size={14} /> Restore
                        <input
                            id="restore-input"
                            type="file"
                            accept=".zip"
                            onChange={handleRestoreFile}
                            style={{ display: 'none' }}
                        />
                    </button>
                    <button
                        className="danger"
                        onClick={() => {
                            if (window.confirm('Are you sure you want to delete ALL saved places? This cannot be undone.')) {
                                clearAll();
                            }
                        }}
                        style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', padding: '10px', fontSize: '13px' }}
                    >
                        <Trash2 size={14} /> Clear All
                    </button>
                </div>
            </aside >
        </>
    );
}
