/**
 * PlaceDetailsModal.jsx — Place Details & Memories Modal
 *
 * Full-screen modal showing detailed information about a saved place:
 *   - Header with place name, category badge, and inline category editor
 *   - Restricted access flow for "Shabbat Dinner" categories (apply → pending → approved)
 *   - Approved view: address, photo/memory grid, and "Add Memory" form
 *   - Image lightbox for full-screen photo viewing
 *
 * Memories can be text notes, uploaded images, or file attachments.
 * Files are stored as Base64 data URIs in IndexedDB.
 */
import { useState, useEffect } from 'react';
import { X, Lock, Clock, FileText, MapPin, Upload, Edit2, Trash2 } from 'lucide-react';
import { usePlaces } from '../../contexts/PlacesContext';
import ImageLightbox from '../UI/ImageLightbox';
import { useDialog } from '../../hooks/useDialog.jsx';
import SecureImageUpload from '../Media/SecureImageUpload';

/**
 * @param {Object}   props
 * @param {string}   props.placeId — ID of the place to display
 * @param {Function} props.onClose — Callback to close the modal
 */
export default function PlaceDetailsModal({ placeId, onClose }) {
    // Pull place management functions from context
    const { getPlace, submitRequest, approvePlace, categories, addCategory, updatePlaceCategory, refreshPlaces, removeMedia } = usePlaces();
    const place = getPlace(placeId);
    // DialogComponent renders the custom confirm/alert dialog when triggered
    const { DialogComponent } = useDialog();

    const [viewState, setViewState] = useState('details'); // 'details' | 'apply'
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', socialHandle: '',
        militaryId: '', hasAllergies: false, allergies: ''
    });

    // Lightbox state
    const [lightboxImage, setLightboxImage] = useState(null);

    // Media blob URLs caching to prevent re-fetching on every render
    const [mediaUrls, setMediaUrls] = useState({});

    // Fetch secure images/media from backend or fallback to dataUrl
    useEffect(() => {
        if (!place || !place.media) return;
        
        const fetchMedia = async (m) => {
            if (mediaUrls[m.id]) return;
            
            if (m.dataUrl) {
                setMediaUrls(prev => ({ ...prev, [m.id]: m.dataUrl }));
                return;
            }
            
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const token = localStorage.getItem('travelmaps_token');
                
                const response = await fetch(`${apiUrl}/api/media/${m.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    if (m.type === 'text/plain') {
                        const text = await blob.text();
                        setMediaUrls(prev => ({ ...prev, [m.id]: text }));
                    } else {
                        const blobUrl = URL.createObjectURL(blob);
                        setMediaUrls(prev => ({ ...prev, [m.id]: blobUrl }));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch media file from backend:', err);
            }
        };

        place.media.forEach(fetchMedia);

        return () => {
            Object.values(mediaUrls).forEach(url => {
                if (url && typeof url === 'string' && url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [place?.media]);


    // Edit Category state
    const [isEditingCategory, setIsEditingCategory] = useState(false);

    // If the place was deleted or doesn't exist, render nothing
    if (!place) return null;

    // Approval-based access control flags
    const isPending = place.approvalStatus === 'pending';     // User has applied, waiting for host
    const isApproved = place.approvalStatus === 'approved';   // Full access granted
    const isLoneSoldier = place.category === 'Lone Soldier Shabbat Dinners'; // Requires military ID

    /** Submits an access request for restricted Shabbat Dinner places */
    const handleApply = (e) => {
        e.preventDefault();
        const request = {
            id: 'req_' + Date.now(),
            date: new Date().toISOString(),
            ...formData
        };
        submitRequest(placeId, request);
        setViewState('details'); // Return to details view — it will now show 'pending' state
    };

    // Legacy memory functions removed for strict schema constraint

    /** Handles inline category dropdown changes, including creating new categories */
    const handleCategoryChange = (e) => {
        const val = e.target.value;
        if (val === '__new__') {
            // Prompt user for a custom category name
            const newCat = prompt('Enter name for new category:');
            if (newCat && newCat.trim()) {
                addCategory(newCat.trim());
                updatePlaceCategory(placeId, newCat.trim());
            }
        } else if (val !== '') {
            updatePlaceCategory(placeId, val);
        }
        setIsEditingCategory(false);
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && onClose()}>
            <div className="modal-content" style={{ maxWidth: '700px', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 style={{ margin: 0, fontSize: '24px' }}>{place.name}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            {isEditingCategory ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <select
                                        className="category-select"
                                        value={place.category}
                                        onChange={handleCategoryChange}
                                        autoFocus
                                        onBlur={() => setTimeout(() => setIsEditingCategory(false), 200)}
                                        style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}
                                    >
                                        <option value="Default">Default</option>
                                        {categories.filter(c => c !== 'Default').map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        <option value="__new__">+ Create New...</option>
                                    </select>
                                </div>
                            ) : (
                                <>
                                    <span className="badge" style={{ backgroundColor: place.color, color: '#fff' }}>
                                        {place.category}
                                    </span>
                                    <button
                                        className="icon-btn tiny"
                                        onClick={() => setIsEditingCategory(true)}
                                        title="Edit Category"
                                        style={{ padding: '4px', opacity: 0.6 }}
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <button className="icon-btn" onClick={onClose}><X size={24} /></button>
                </div>

                {/* Content Body */}
                <div className="modal-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Restricted / Pending Views logic remains the same */}
                    {!isApproved && (
                        // ... (Restricted/Pending view JSX)
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                            {viewState === 'apply' ? (
                                <form onSubmit={handleApply} className="rsvp-form" style={{ width: '100%', maxWidth: '400px', textAlign: 'left' }}>
                                    <h3>📝 Request Access</h3>
                                    <div className="form-row">
                                        <input required placeholder="First Name" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                                        <input required placeholder="Last Name" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                                    </div>
                                    <input required placeholder="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    <input required placeholder="Social Handle" value={formData.socialHandle} onChange={e => setFormData({ ...formData, socialHandle: e.target.value })} />

                                    {isLoneSoldier && (
                                        <input required placeholder="Military ID (Required)" value={formData.militaryId} onChange={e => setFormData({ ...formData, militaryId: e.target.value })} />
                                    )}

                                    <label style={{ marginTop: '10px', display: 'block' }}>
                                        Allergies?
                                        <span style={{ marginLeft: '10px' }}>
                                            <label><input type="radio" name="al" onChange={() => setFormData({ ...formData, hasAllergies: true })} /> Yes</label>
                                            <label style={{ marginLeft: '10px' }}><input type="radio" name="al" onChange={() => setFormData({ ...formData, hasAllergies: false })} /> No</label>
                                        </span>
                                    </label>
                                    {formData.hasAllergies && (
                                        <textarea placeholder="List allergies..." value={formData.allergies} onChange={e => setFormData({ ...formData, allergies: e.target.value })} />
                                    )}

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                        <button type="button" className="secondary" onClick={() => setViewState('details')}>Cancel</button>
                                        <button type="submit" className="primary">Submit Application</button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    {isPending ? (
                                        <>
                                            <Clock size={48} color="#f1c40f" />
                                            <h3 style={{ color: '#f1c40f' }}>Application Pending</h3>
                                            <p>Your request to join is waiting for approval.</p>
                                            <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '20px' }}>
                                                (Demo: Click below to simulate host approval)
                                            </div>
                                            <button className="primary" style={{ marginTop: '10px', background: '#2ecc71' }} onClick={() => approvePlace(placeId)}>
                                                Simulate Admin Approval
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={48} color="#e74c3c" />
                                            <h3 style={{ color: '#e74c3c' }}>Restricted Access</h3>
                                            <p>This is a private event. You must apply to view full details (address, photos) and join.</p>
                                            <button className="primary" style={{ marginTop: '20px' }} onClick={() => setViewState('apply')}>
                                                Request to Join
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Approved View - Full Details */}
                    {isApproved && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <MapPin size={20} color="#3ea6ff" />
                                <span>{place.formatted || 'No address details available.'}</span>
                            </div>

                            {/* Secure Media Grid */}
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <h4 style={{ margin: '0 0 4px 0', textAlign: 'left' }}>🗺️ Place Memories & Media</h4>
                                {!place.media || place.media.length === 0 ? (
                                    <div className="empty-state" style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                                        No memories saved yet. Add notes, photos, videos, or record a voice note below!
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {place.media.map(m => (
                                            <div key={m.id} className="memory-card" style={{ background: 'var(--surface)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span className="badge" style={{ fontSize: '10px', padding: '2px 8px', background: m.tier === 1 ? '#ff6961' : m.tier === 2 ? '#3ea6ff' : '#2ecc71', color: 'white' }}>
                                                        {m.tier === 1 ? 'Private' : m.tier === 2 ? 'Group' : 'Public'}
                                                    </span>
                                                    <button 
                                                        className="icon-btn danger" 
                                                        onClick={() => removeMedia(placeId, m.id)} 
                                                        style={{ padding: '4px', opacity: 0.7, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                {/* Text Note rendering */}
                                                {m.type === 'text/plain' && (
                                                    <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'var(--text-main)', textAlign: 'left', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px' }}>
                                                        {mediaUrls[m.id]}
                                                    </div>
                                                )}

                                                {/* Image rendering */}
                                                {m.type && m.type.startsWith('image/') && mediaUrls[m.id] && (
                                                    <img
                                                        src={mediaUrls[m.id]}
                                                        alt="Saved memory"
                                                        onClick={() => setLightboxImage(mediaUrls[m.id])}
                                                        style={{ cursor: 'pointer', width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '8px' }}
                                                    />
                                                )}

                                                {/* Video rendering */}
                                                {m.type && m.type.startsWith('video/') && mediaUrls[m.id] && (
                                                    <video
                                                        src={mediaUrls[m.id]}
                                                        controls
                                                        style={{ width: '100%', maxHeight: '250px', background: 'black', borderRadius: '8px' }}
                                                    />
                                                )}

                                                {/* Audio / Voice rendering */}
                                                {m.type && m.type.startsWith('audio/') && mediaUrls[m.id] && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textAlign: 'left' }}>
                                                            {m.name || 'Voice Note'}
                                                        </div>
                                                        <audio
                                                            src={mediaUrls[m.id]}
                                                            controls
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                )}
                                                
                                                {m.created_at && (
                                                    <div style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'right' }}>
                                                        {new Date(m.created_at).toLocaleDateString()} {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Secure Upload Form */}
                            <SecureImageUpload placeId={placeId} onUploadSuccess={refreshPlaces} />
                        </>
                    )}

                </div>
            </div>

            {/* Lightbox */}
            {lightboxImage && (
                <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
            )}

            {/* Custom Dialog */}
            {DialogComponent}
        </div>
    );
}
