/**
 * PlaceDetailsModal.jsx — Place Details & Memories Modal
 *
 * Full-screen modal showing detailed information about a saved place:
 *   - Header with place name, category badge, and inline category editor
 *   - Address, notes, YouTube player, photo/memory grid, and "Add Memory" form
 *   - Image lightbox for full-screen photo viewing
 *   - View-only permissions for shared pins; collaborative exceptions
 */
import { useState, useEffect, useRef } from 'react';
import { X, FileText, MapPin, Edit2, Trash2, Youtube, Save, StickyNote, User } from 'lucide-react';
import { usePlaces } from '../../contexts/PlacesContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSocial } from '../../contexts/SocialContext';
import ImageLightbox from '../UI/ImageLightbox';
import { useDialog } from '../../hooks/useDialog.jsx';
import SecureImageUpload from '../Media/SecureImageUpload';

/**
 * Extract a YouTube video ID from various URL formats.
 */
function extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/ // bare video ID
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * @param {Object}   props
 * @param {string}   props.placeId — ID of the place to display
 * @param {Function} props.onClose — Callback to close the modal
 */
export default function PlaceDetailsModal({ placeId, onClose }) {
    const { getPlace, categories, addCategory, updatePlaceCategory, refreshPlaces, removeMedia, updatePlace } = usePlaces();
    const { user } = useAuth();
    const { sendFriendRequestById } = useSocial();
    const { DialogComponent } = useDialog();

    // Local cached copy of place details loaded from context or API
    const [placeDetails, setPlaceDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(true);

    // Lightbox state
    const [lightboxImage, setLightboxImage] = useState(null);

    // Media blob URLs caching
    const [mediaUrls, setMediaUrls] = useState({});

    // Notes editing state
    const [notesText, setNotesText] = useState('');
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [notesSaving, setNotesSaving] = useState(false);

    // YouTube URL editing state
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isEditingYoutube, setIsEditingYoutube] = useState(false);
    const [youtubeSaving, setYoutubeSaving] = useState(false);

    // Edit Category state
    const [isEditingCategory, setIsEditingCategory] = useState(false);

    const currentUserId = user ? (typeof user === 'object' ? user.id : user) : null;

    // Fetch place details including owner name, avatar, and friendship status on mount
    const fetchDetails = async () => {
        setLoadingDetails(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            const response = await fetch(`${apiUrl}/api/places/${placeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                
                // Normalize media items: alias mime_type → type for frontend components
                const normalizedMedia = (data.media || []).map(m => ({
                    ...m,
                    type: m.mime_type || m.type
                }));

                const details = {
                    ...data,
                    media: normalizedMedia,
                    memories: normalizedMedia,
                    isShared: data.user_id !== currentUserId
                };

                setPlaceDetails(details);
                setNotesText(details.notes || '');
                setYoutubeUrl(details.youtube_url || '');
            } else {
                // Fallback to local copy from context if API fails
                const localPlace = getPlace(placeId);
                if (localPlace) {
                    setPlaceDetails({
                        ...localPlace,
                        isShared: localPlace.user_id !== currentUserId
                    });
                    setNotesText(localPlace.notes || '');
                    setYoutubeUrl(localPlace.youtube_url || '');
                }
            }
        } catch (err) {
            console.error('Failed to fetch place details:', err);
            const localPlace = getPlace(placeId);
            if (localPlace) {
                setPlaceDetails({
                    ...localPlace,
                    isShared: localPlace.user_id !== currentUserId
                });
                setNotesText(localPlace.notes || '');
                setYoutubeUrl(localPlace.youtube_url || '');
            }
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => {
        if (placeId) {
            fetchDetails();
        }
    }, [placeId, currentUserId]);

    // Fetch secure images/media from backend or fallback to dataUrl
    useEffect(() => {
        if (!placeDetails || !placeDetails.media) return;
        
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
                    const mimeType = m.type || m.mime_type || '';
                    if (mimeType === 'text/plain') {
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

        placeDetails.media.forEach(fetchMedia);

        return () => {
            Object.values(mediaUrls).forEach(url => {
                if (url && typeof url === 'string' && url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [placeDetails?.media]);

    // Handle delete action for media file
    const handleDeleteMedia = async (mediaId) => {
        if (confirm('Are you sure you want to delete this memory?')) {
            try {
                await removeMedia(placeId, mediaId);
                // Reload details to sync UI
                fetchDetails();
            } catch (err) {
                alert('Failed to delete media: ' + err.message);
            }
        }
    };

    // If still loading details and no local cached data is available yet
    if (loadingDetails && !placeDetails) {
        return (
            <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: '700px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
                    <div style={{ color: 'var(--accent)' }}>Loading details...</div>
                </div>
            </div>
        );
    }

    if (!placeDetails) return null;

    // Determine permissions dynamically from loaded details
    const isOwner = placeDetails.user_id === currentUserId;
    const isCollaborative = placeDetails.collaborative || false;
    const canEdit = isOwner || isCollaborative;

    /** Handles inline category dropdown changes, including creating new categories */
    const handleCategoryChange = (e) => {
        const val = e.target.value;
        if (val === '__new__') {
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

    /** Save notes to backend */
    const handleSaveNotes = async () => {
        setNotesSaving(true);
        try {
            await updatePlace(placeId, { notes: notesText });
            setIsEditingNotes(false);
            fetchDetails(); // Reload details
        } catch (err) {
            console.error('Failed to save notes:', err);
        } finally {
            setNotesSaving(false);
        }
    };

    /** Save YouTube URL to backend */
    const handleSaveYoutube = async () => {
        setYoutubeSaving(true);
        try {
            await updatePlace(placeId, { youtube_url: youtubeUrl.trim() });
            setIsEditingYoutube(false);
            fetchDetails(); // Reload details
        } catch (err) {
            console.error('Failed to save YouTube URL:', err);
        } finally {
            setYoutubeSaving(false);
        }
    };

    const handleAddFriend = async () => {
        if (!placeDetails?.user_id) return;
        const res = await sendFriendRequestById(placeDetails.user_id);
        if (res.success) {
            alert('Friend request sent!');
            fetchDetails(); // Reload details
        } else {
            alert(res.error || 'Failed to send friend request');
        }
    };

    const youtubeVideoId = extractYouTubeId(placeDetails.youtube_url || youtubeUrl);

    return (
        <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && onClose()}>
            <div className="modal-content" style={{ maxWidth: '700px', minHeight: '500px', display: 'flex', flexDirection: 'column', width: '90%' }}>

                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 style={{ margin: 0, fontSize: '24px' }}>{placeDetails.name}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            {isEditingCategory && isOwner ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <select
                                        className="category-select"
                                        value={placeDetails.category}
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
                                    <span className="badge" style={{ backgroundColor: placeDetails.color, color: '#fff' }}>
                                        {placeDetails.category}
                                    </span>
                                    {isOwner && (
                                        <button
                                            className="icon-btn tiny"
                                            onClick={() => setIsEditingCategory(true)}
                                            title="Edit Category"
                                            style={{ padding: '4px', opacity: 0.6 }}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    )}
                                    {placeDetails.isShared && (
                                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic' }}>
                                            Shared by {placeDetails.owner_name || 'Friend'}
                                        </span>
                                    )}
                                    {isCollaborative && (
                                        <span className="badge" style={{ backgroundColor: '#f39c12', color: '#fff', fontSize: '10px', padding: '2px 6px' }}>
                                            Collaborative
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    <button className="icon-btn" onClick={onClose}><X size={24} /></button>
                </div>

                {/* Content Body */}
                <div className="modal-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>

                    {/* Address Card */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <MapPin size={20} color="#3ea6ff" />
                        <span>{placeDetails.formatted || 'No address details available.'}</span>
                    </div>

                    {/* Owner block & Friendship Actions */}
                    {placeDetails.owner_name && placeDetails.user_id !== currentUserId && (
                        <div className="pin-owner-block" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'var(--accent)',
                                    color: 'white',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px'
                                }}>
                                    {placeDetails.owner_name[0].toUpperCase()}
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Owner</div>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{placeDetails.owner_name}</div>
                                </div>
                            </div>
                            <div>
                                {placeDetails.friendship === null && (
                                    <button 
                                        className="small-btn primary" 
                                        onClick={handleAddFriend}
                                        style={{ fontSize: '12px', padding: '6px 12px' }}
                                    >
                                        Add Friend
                                    </button>
                                )}
                                {placeDetails.friendship?.status === 'pending' && (
                                    <span style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
                                        Request Sent
                                    </span>
                                )}
                                {placeDetails.friendship?.status === 'accepted' && (
                                    <span className="badge" style={{ backgroundColor: 'var(--accent)', color: '#fff', fontSize: '11px' }}>
                                        Friends
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* YouTube Player Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {youtubeVideoId && (
                            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '10px', overflow: 'hidden', background: '#000' }}>
                                <iframe
                                    src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}`}
                                    title="YouTube video"
                                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                />
                            </div>
                        )}
                        {canEdit && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {isEditingYoutube ? (
                                    <>
                                        <input
                                            type="url"
                                            placeholder="Paste YouTube URL..."
                                            value={youtubeUrl}
                                            onChange={(e) => setYoutubeUrl(e.target.value)}
                                            style={{
                                                flex: 1, height: '36px', padding: '0 10px',
                                                background: 'var(--input-bg)', color: 'var(--text-main)',
                                                border: '1px solid var(--border)', borderRadius: '8px',
                                                fontSize: '13px', outline: 'none'
                                            }}
                                        />
                                        <button className="small-btn primary" onClick={handleSaveYoutube} disabled={youtubeSaving} style={{ padding: '6px 12px', fontSize: '12px' }}>
                                            {youtubeSaving ? '...' : 'Save'}
                                        </button>
                                        <button className="small-btn secondary" onClick={() => { setIsEditingYoutube(false); setYoutubeUrl(placeDetails.youtube_url || ''); }} style={{ padding: '6px 12px', fontSize: '12px' }}>
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="small-btn secondary"
                                        onClick={() => setIsEditingYoutube(true)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '4px 10px' }}
                                    >
                                        <Youtube size={14} /> {placeDetails.youtube_url ? 'Change Video' : 'Add YouTube Link'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Notes Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <StickyNote size={16} /> Notes
                            </h4>
                            {canEdit && !isEditingNotes && (
                                <button
                                    className="small-btn secondary"
                                    onClick={() => setIsEditingNotes(true)}
                                    style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <Edit2 size={12} /> Edit
                                </button>
                            )}
                        </div>
                        {isEditingNotes && canEdit ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <textarea
                                    value={notesText}
                                    onChange={(e) => setNotesText(e.target.value)}
                                    placeholder="Write notes about this place..."
                                    style={{
                                        width: '100%', minHeight: '80px', padding: '12px',
                                        background: 'var(--input-bg)', color: 'var(--text-main)',
                                        border: '1px solid var(--border)', borderRadius: '8px',
                                        fontSize: '14px', outline: 'none', resize: 'vertical',
                                        lineHeight: '1.5'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                    <button className="small-btn secondary" onClick={() => { setIsEditingNotes(false); setNotesText(placeDetails.notes || ''); }} style={{ padding: '4px 10px', fontSize: '12px' }}>
                                        Cancel
                                    </button>
                                    <button className="small-btn primary" onClick={handleSaveNotes} disabled={notesSaving} style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Save size={12} /> {notesSaving ? 'Saving...' : 'Save Notes'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap',
                                color: (placeDetails.notes || notesText) ? 'var(--text-main)' : 'var(--muted)',
                                background: 'rgba(0,0,0,0.06)', padding: '12px', borderRadius: '8px',
                                minHeight: '40px', textAlign: 'left'
                            }}>
                                {placeDetails.notes || notesText || 'No notes yet.'}
                            </div>
                        )}
                    </div>

                    {/* Secure Media Grid */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ margin: '0 0 4px 0', textAlign: 'left' }}>🗺️ Place Memories & Media</h4>
                        {!placeDetails.media || placeDetails.media.length === 0 ? (
                            <div className="empty-state" style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                                No memories saved yet. {canEdit ? 'Add notes, photos, videos, or record a voice note below!' : ''}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {placeDetails.media.map(m => {
                                    const mimeType = m.type || m.mime_type || '';
                                    return (
                                        <div key={m.id} className="memory-card" style={{ background: 'var(--surface)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span className="badge" style={{ fontSize: '10px', padding: '2px 8px', background: m.tier === 1 ? '#ff6961' : m.tier === 2 ? '#3ea6ff' : '#2ecc71', color: 'white' }}>
                                                    {m.tier === 1 ? 'Private' : m.tier === 2 ? 'Group' : 'Public'}
                                                </span>
                                                {(isOwner || m.uploader_id === currentUserId) && (
                                                    <button 
                                                        className="icon-btn danger" 
                                                        onClick={() => handleDeleteMedia(m.id)} 
                                                        style={{ padding: '4px', opacity: 0.7, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Text Note rendering */}
                                            {mimeType === 'text/plain' && (
                                                <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'var(--text-main)', textAlign: 'left', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px' }}>
                                                    {mediaUrls[m.id] || 'Loading note...'}
                                                </div>
                                            )}

                                            {/* Image rendering */}
                                            {mimeType && mimeType.startsWith('image/') && mediaUrls[m.id] && (
                                                <img
                                                    src={mediaUrls[m.id]}
                                                    alt="Saved memory"
                                                    onClick={() => setLightboxImage(mediaUrls[m.id])}
                                                    style={{ cursor: 'pointer', width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '8px' }}
                                                />
                                            )}

                                            {/* Video rendering */}
                                            {mimeType && mimeType.startsWith('video/') && mediaUrls[m.id] && (
                                                <video
                                                    src={mediaUrls[m.id]}
                                                    controls
                                                    style={{ width: '100%', maxHeight: '250px', background: 'black', borderRadius: '8px' }}
                                                />
                                            )}

                                            {/* Audio / Voice rendering */}
                                            {mimeType && mimeType.startsWith('audio/') && mediaUrls[m.id] && (
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

                                            {/* Generic File Download rendering */}
                                            {mimeType && !mimeType.startsWith('image/') && !mimeType.startsWith('video/') && !mimeType.startsWith('audio/') && mimeType !== 'text/plain' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px' }}>
                                                    <FileText size={24} style={{ color: 'var(--accent)' }} />
                                                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || 'Attachment'}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>File memory</div>
                                                    </div>
                                                    {mediaUrls[m.id] && (
                                                        <a 
                                                            href={mediaUrls[m.id]} 
                                                            download={m.name || 'attachment'} 
                                                            className="small-btn primary"
                                                            style={{ textDecoration: 'none', padding: '4px 8px', fontSize: '11px' }}
                                                        >
                                                            Download
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {m.created_at && (
                                                <div style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'right' }}>
                                                    {new Date(m.created_at).toLocaleDateString()} {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Secure Upload Form */}
                    {canEdit && (
                        <SecureImageUpload placeId={placeId} onUploadSuccess={fetchDetails} />
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
