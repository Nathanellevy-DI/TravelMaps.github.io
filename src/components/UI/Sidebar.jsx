/**
 * Sidebar.jsx — Slide-Out Places Panel
 *
 * A slide-out panel on the left side of the screen showing:
 *   - Category filter dropdown to narrow the places list
 *   - List of saved places with actions: Details, Share, Go To, Delete
 *   - Footer buttons: Backup, Theme toggle, Friends, Restore, Clear All
 *
 * Also renders the FriendsModal and ShareModal when triggered.
 *
 * Each place card shows:
 *   - Place name, category badge with color indicator
 *   - Address and memory count
 *   - Shared-by label if the place was received from a friend
 */
import { useState } from 'react';
import { X, Camera, MapPin, Trash2, Filter, Sun, Moon, Download, Upload, Users, Share2 } from 'lucide-react';
import { usePlaces } from '../../contexts/PlacesContext';
import { exportBackup, importBackup } from '../../utils/backup';
import FriendsContent from './FriendsContent';
import ShareModal from '../Modals/ShareModal';
import AdminPanel from './AdminPanel';

/**
 * @param {Object}   props
 * @param {boolean}  props.isOpen      — Whether the sidebar is visible
 * @param {Function} props.onClose     — Callback to close the sidebar
 * @param {Object}   props.map         — Leaflet map instance for flyTo
 * @param {string}   props.theme       — Current theme ('dark' or 'light')
 * @param {Function} props.toggleTheme — Toggles dark/light theme
 * @param {string}   props.user        — Current user display name
 */
export default function Sidebar({ isOpen, onClose, map, theme, toggleTheme, user }) {
    const { savedPlaces, removePlace, clearAll, categories, restoreData } = usePlaces();
    const [activeSidebarTab, setActiveSidebarTab] = useState('places');
    const [filterCategory, setFilterCategory] = useState('All');
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareType, setShareType] = useState('pin');
    const [shareItem, setShareItem] = useState(null);

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

    const handleSharePin = (place) => {
        if (!place.id) {
            alert('Cannot share this place (missing ID)');
            return;
        }
        setShareType('pin');
        setShareItem(place); // Pass full place object for sync
        setShowShareModal(true);
    };

    const filteredPlaces = filterCategory === 'All'
        ? savedPlaces
        : savedPlaces.filter(p => p.category === filterCategory);

    return (
        <>
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
            <aside className={`sidebar ${isOpen ? 'open' : ''} ${activeSidebarTab === 'admin' ? 'admin-active' : ''}`} id="sidebar">
                <div className="sidebar-header" style={{ paddingBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0 }}>My Hub</h3>
                        <button className="icon-btn" onClick={onClose} aria-label="Close">
                            <X size={20} />
                        </button>
                    </div>
                    
                    {/* Top Level Tabs */}
                    <div style={{ display: 'flex', width: '100%' }}>
                        <button
                            onClick={() => setActiveSidebarTab('places')}
                            style={{
                                flex: 1, padding: '12px 0', background: 'transparent', border: 'none',
                                borderBottom: activeSidebarTab === 'places' ? '2px solid var(--accent)' : '2px solid transparent',
                                color: activeSidebarTab === 'places' ? 'var(--accent)' : 'var(--muted)',
                                fontWeight: 600, cursor: 'pointer', fontSize: '13px'
                            }}
                        >
                            Places
                        </button>
                        <button
                            onClick={() => setActiveSidebarTab('friends')}
                            style={{
                                flex: 1, padding: '12px 0', background: 'transparent', border: 'none',
                                borderBottom: activeSidebarTab === 'friends' ? '2px solid var(--accent)' : '2px solid transparent',
                                color: activeSidebarTab === 'friends' ? 'var(--accent)' : 'var(--muted)',
                                fontWeight: 600, cursor: 'pointer', fontSize: '13px'
                            }}
                        >
                            Friends
                        </button>
                        {user?.email?.toLowerCase() === 'travelmaps@inbox.ru' && (
                            <button
                                onClick={() => setActiveSidebarTab('admin')}
                                style={{
                                    flex: 1, padding: '12px 0', background: 'transparent', border: 'none',
                                    borderBottom: activeSidebarTab === 'admin' ? '2px solid var(--accent)' : '2px solid transparent',
                                    color: activeSidebarTab === 'admin' ? 'var(--accent)' : 'var(--muted)',
                                    fontWeight: 600, cursor: 'pointer', fontSize: '13px'
                                }}
                             >
                                 Admin
                             </button>
                        )}
                    </div>
                </div>

                <div className="sidebar-scrollable-content" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {activeSidebarTab === 'places' ? (
                        <>

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
                                        {place.formatted || `${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`} • {(place.media || place.memories || []).length} memories
                                        {place.isShared && (
                                            <div style={{ color: 'var(--accent)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Users size={10} /> Shared by {place.sharedBy?.username || 'Friend'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="saved-actions">
                                    <button className="small-btn" title="Details" onClick={() => handleOpenDetails(place.id)}>
                                        <Camera size={14} />
                                    </button>
                                    {!place.isShared && (
                                        <button className="small-btn" title="Share" onClick={() => handleSharePin(place)}>
                                            <Share2 size={14} />
                                        </button>
                                    )}
                                    <button className="small-btn" title="Go" onClick={() => handleGoTo(place)}>
                                        <MapPin size={14} />
                                    </button>
                                    {!place.isShared && (
                                        <button className="small-btn danger" title="Delete" onClick={() => removePlace(place.id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    </div>
                    </>
                    ) : activeSidebarTab === 'friends' ? (
                        <FriendsContent user={user} />
                    ) : (
                        user?.email?.toLowerCase() === 'travelmaps@inbox.ru' ? <AdminPanel /> : <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Access Denied</div>
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
                        {theme === 'dark' ? 'Light' : 'Dark'}
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
                        style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', padding: '10px', fontSize: '13px', gridColumn: 'span 2' }}
                    >
                        <Trash2 size={14} /> Clear All
                    </button>
                </div>
            </aside >
            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                type={shareType}
                item={shareItem}
            />
        </>
    );
}
