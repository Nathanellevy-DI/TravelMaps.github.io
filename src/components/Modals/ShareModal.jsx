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
import { fetchApi } from '../../services/apiClient';
import { usePlaces } from '../../contexts/PlacesContext';

export default function ShareModal({ isOpen, onClose, type, item }) {
    const { updateVisibility } = usePlaces();
    const [sharing, setSharing] = useState(false);
    const [selectedVisibility, setSelectedVisibility] = useState(item?.visibility || 'private');

    const handleShare = async () => {
        if (!item?.id) return;

        setSharing(true);
        try {
            await updateVisibility(item.id, selectedVisibility);
            alert(`Place visibility updated to "${selectedVisibility}"!`);
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

                    <h4 style={{ marginBottom: '12px' }}>Who can see this place?</h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                        {visibilityOptions.map(({ value, label, icon: Icon, desc }) => (
                            <div
                                key={value}
                                onClick={() => setSelectedVisibility(value)}
                                className="saved-card"
                                style={{
                                    padding: '14px',
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
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: selectedVisibility === value ? 'var(--accent)' : 'var(--border)',
                                    flexShrink: 0
                                }}>
                                    <Icon size={18} color={selectedVisibility === value ? 'white' : 'var(--muted)'} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{label}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        className="primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={handleShare}
                        disabled={sharing || selectedVisibility === item?.visibility}
                    >
                        {sharing ? 'Updating...' : 'Update Visibility'}
                    </button>
                </div>
            </div>
        </div>
    );
}

