import { useState, useEffect } from 'react';
import { X, Share2, Check, Users } from 'lucide-react';
import * as friendService from '../../services/friendService';
import * as shareService from '../../services/shareService';

export default function ShareModal({ isOpen, onClose, type, item }) { // type: 'pin' or 'category'
    const [friends, setFriends] = useState([]);
    const [selectedFriendIds, setSelectedFriendIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadFriends();
            setSelectedFriendIds([]);
        }
    }, [isOpen]);

    const loadFriends = async () => {
        setLoading(true);
        try {
            const data = await friendService.getFriends();
            setFriends(data || []);
        } catch (err) {
            console.error('Failed to load friends:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (friendId) => {
        if (selectedFriendIds.includes(friendId)) {
            setSelectedFriendIds(selectedFriendIds.filter(id => id !== friendId));
        } else {
            setSelectedFriendIds([...selectedFriendIds, friendId]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedFriendIds.length === friends.length) {
            setSelectedFriendIds([]);
        } else {
            setSelectedFriendIds(friends.map(f => f.friend.id));
        }
    };

    const handleShare = async () => {
        if (selectedFriendIds.length === 0) return;

        setSharing(true);
        try {
            if (type === 'pin') {
                await shareService.sharePin(item.id, selectedFriendIds, item);
                alert('Pin shared successfully!');
            } else if (type === 'category') {
                await shareService.shareCategory(item.id, selectedFriendIds);
                alert('Category shared successfully!');
            }
            onClose();
        } catch (err) {
            alert('Failed to share item');
            console.error(err);
        } finally {
            setSharing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3><Share2 size={20} /> Share {type === 'pin' ? 'Pin' : 'Category'}</h3>
                    <button className="icon-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{item?.title || item?.name}</div>
                        {item?.description && <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{item.description}</div>}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0 }}>Select Friends</h4>
                        <button
                            onClick={toggleSelectAll}
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                        >
                            {selectedFriendIds.length === friends.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '20px' }}>Loading friends...</div>
                        ) : friends.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No friends found. Add friends first!</div>
                        ) : (
                            friends.map(({ friend }) => (
                                <div
                                    key={friend.id}
                                    onClick={() => toggleSelection(friend.id)}
                                    className="saved-card"
                                    style={{
                                        padding: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        border: selectedFriendIds.includes(friend.id) ? '1px solid var(--accent)' : '1px solid var(--border)',
                                        background: selectedFriendIds.includes(friend.id) ? 'var(--input-bg)' : 'transparent'
                                    }}
                                >
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        border: '2px solid var(--border)',
                                        marginRight: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: selectedFriendIds.includes(friend.id) ? 'var(--accent)' : 'transparent',
                                        borderColor: selectedFriendIds.includes(friend.id) ? 'var(--accent)' : 'var(--border)'
                                    }}>
                                        {selectedFriendIds.includes(friend.id) && <Check size={12} color="white" />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{friend.displayName || friend.username}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>@{friend.username}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        className="primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={handleShare}
                        disabled={selectedFriendIds.length === 0 || sharing}
                    >
                        {sharing ? 'Sharing...' : `Share with ${selectedFriendIds.length} Friend${selectedFriendIds.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
