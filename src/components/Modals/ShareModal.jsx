/**
 * ShareModal.jsx — Share Pins/Categories with Friends
 *
 * Modal for sharing a pin or category with friends by updating its visibility.
 * The server uses visibility-based sharing: 'private', 'friends', or 'public'.
 *
 * @param {Object}   props
 * @param {boolean}  props.isOpen  — Whether the modal is visible
 * @param {Function} props.onClose — Callback to close the modal
 * @param {string}   props.type    — 'pin' or 'category'
 * @param {Object}   props.item    — The pin or category object to share
 */
import { useState } from 'react';
import { X, Share2, Globe, Users, Lock } from 'lucide-react';
import { usePlaces } from '../../contexts/PlacesContext';
import { useSocial } from '../../contexts/SocialContext';

export default function ShareModal({ isOpen, onClose, type, item }) {
    const { updateVisibility, updatePlace } = usePlaces();
    const { friends } = useSocial();
    const [sharing, setSharing] = useState(false);
    const [selectedVisibility, setSelectedVisibility] = useState(item?.visibility || 'private');
    const [isCollaborative, setIsCollaborative] = useState(item?.collaborative || false);

    const handleShare = async () => {
        if (!item?.id) return;

        setSharing(true);
        try {
            await updateVisibility(item.id, selectedVisibility);
            // Also update the collaborative flag
            await updatePlace(item.id, { collaborative: isCollaborative });
            alert(`Place visibility updated!`);
            onClose();
        } catch (err) {
            alert('Failed to update sharing: ' + err.message);
            console.error(err);
        } finally {
            setSharing(false);
        }
    };

    if (!isOpen) return null;

    const visibilityOptions = [
        { value: 'private', label: 'Private', icon: Lock, desc: 'Only you can see this place' },
        { value: 'friends', label: 'Friends', icon: Users, desc: 'Your friends can see this place' },
        { value: 'public', label: 'Public', icon: Globe, desc: 'Everyone can see this place' },
    ];

    const getButtonText = () => {
        if (sharing) return 'Updating...';
        if (selectedVisibility === 'private') return 'Make Private';
        if (selectedVisibility === 'friends') return 'Share with all Friends';
        if (selectedVisibility === 'public') return 'Make Public';
        
        const selectedFriend = friends.find(f => f.id === selectedVisibility);
        if (selectedFriend) {
            return `Share with ${selectedFriend.display_name}`;
        }
        return 'Update Visibility';
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3><Share2 size={20} /> Share {type === 'pin' ? 'Place' : 'Category'}</h3>
                    <button className="icon-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{item?.title || item?.name}</div>
                        {item?.formatted && <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{item.formatted}</div>}
                    </div>

                    <h4 style={{ marginBottom: '12px' }}>General visibility:</h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        {visibilityOptions.map(({ value, label, icon: Icon, desc }) => (
                            <div
                                key={value}
                                onClick={() => setSelectedVisibility(value)}
                                className="saved-card"
                                style={{
                                    padding: '12px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    gap: '12px',
                                    border: selectedVisibility === value ? '1px solid var(--accent)' : '1px solid var(--border)',
                                    background: selectedVisibility === value ? 'var(--input-bg)' : 'transparent',
                                    borderRadius: '10px'
                                }}
                            >
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: selectedVisibility === value ? 'var(--accent)' : 'var(--border)',
                                    flexShrink: 0
                                }}>
                                    <Icon size={16} color={selectedVisibility === value ? 'white' : 'var(--muted)'} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{label}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {friends.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ marginBottom: '12px' }}>Or share with a specific friend:</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                                {friends.map(friend => {
                                    const isSelected = selectedVisibility === friend.id;
                                    return (
                                        <div
                                            key={friend.id}
                                            onClick={() => setSelectedVisibility(friend.id)}
                                            className="saved-card"
                                            style={{
                                                padding: '10px 14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                gap: '12px',
                                                border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                                                background: isSelected ? 'var(--input-bg)' : 'transparent',
                                                borderRadius: '10px'
                                            }}
                                        >
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: isSelected ? 'var(--accent)' : 'var(--border)',
                                                color: isSelected ? 'white' : 'var(--muted)',
                                                fontWeight: 600,
                                                fontSize: '12px',
                                                flexShrink: 0
                                            }}>
                                                {friend.display_name ? friend.display_name[0].toUpperCase() : 'F'}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{friend.display_name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{friend.email}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Collaborative toggle — only show when sharing with someone */}
                    {selectedVisibility !== 'private' && (
                        <div
                            onClick={() => setIsCollaborative(!isCollaborative)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px 14px', marginBottom: '16px',
                                border: isCollaborative ? '1px solid #f39c12' : '1px solid var(--border)',
                                background: isCollaborative ? 'rgba(243, 156, 18, 0.08)' : 'transparent',
                                borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                width: '20px', height: '20px', borderRadius: '4px', border: '2px solid',
                                borderColor: isCollaborative ? '#f39c12' : 'var(--muted)',
                                background: isCollaborative ? '#f39c12' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '14px', fontWeight: 700, flexShrink: 0
                            }}>
                                {isCollaborative ? '✓' : ''}
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>Collaborative Pin</div>
                                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Recipients can add photos, notes, and media</div>
                            </div>
                        </div>
                    )}

                    <button
                        className="primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={handleShare}
                        disabled={sharing || (selectedVisibility === item?.visibility && isCollaborative === (item?.collaborative || false))}
                    >
                        {getButtonText()}
                    </button>
                </div>
            </div>
        </div>
    );
}

