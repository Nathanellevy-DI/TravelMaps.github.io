/**
 * ShareModal.jsx — Share Pins/Categories with Friends
 *
 * Modal for sharing a pin with friends by updating its visibility.
 * Supports Private, Friends, Specific Friends, Groups, or Public visibility.
 */
import { useState, useEffect } from 'react';
import { X, Share2, Globe, Users, Lock, User, FolderPlus, Plus, Check } from 'lucide-react';
import { usePlaces } from '../../contexts/PlacesContext';
import { useSocial } from '../../contexts/SocialContext';

export default function ShareModal({ isOpen, onClose, type, item }) {
    const { sharePlace } = usePlaces();
    const { friends } = useSocial();

    const [sharing, setSharing] = useState(false);
    const [selectedVisibility, setSelectedVisibility] = useState(item?.visibility || 'private');
    const [isCollaborative, setIsCollaborative] = useState(item?.collaborative || false);

    // Group & Specific Shares States
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState(item?.shared_group_id || '');
    const [selectedFriendIds, setSelectedFriendIds] = useState([]);

    // Inline Group Creation State
    const [showNewGroupInput, setShowNewGroupInput] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [creatingGroup, setCreatingGroup] = useState(false);

    // Load existing sharing settings
    useEffect(() => {
        if (!isOpen || !item?.id) return;

        setSelectedVisibility(item.visibility || 'private');
        setIsCollaborative(item.collaborative || false);
        setSelectedGroupId(item.shared_group_id || '');

        const fetchExistingShares = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const token = localStorage.getItem('travelmaps_token');
                if (token) {
                    // Fetch places details to get current shared friends
                    const res = await fetch(`${apiUrl}/api/places/${item.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.sharedWithUserIds) {
                            setSelectedFriendIds(data.sharedWithUserIds);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load existing shares:', err);
            }
        };

        const fetchGroups = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const token = localStorage.getItem('travelmaps_token');
                if (token) {
                    const res = await fetch(`${apiUrl}/api/groups`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setGroups(data);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch groups:', err);
            }
        };

        fetchExistingShares();
        fetchGroups();
    }, [isOpen, item]);

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        setCreatingGroup(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            const res = await fetch(`${apiUrl}/api/groups`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newGroupName.trim(),
                    memberUserIds: selectedFriendIds
                })
            });

            if (res.ok) {
                const newGroup = await res.json();
                setGroups(prev => [newGroup, ...prev]);
                setSelectedGroupId(newGroup.groupId);
                setNewGroupName('');
                setShowNewGroupInput(false);
                alert(`Group "${newGroup.name}" created!`);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create group');
            }
        } catch (err) {
            alert('Error creating group: ' + err.message);
        } finally {
            setCreatingGroup(false);
        }
    };

    const handleFriendToggle = (friendId) => {
        setSelectedFriendIds(prev => 
            prev.includes(friendId)
                ? prev.filter(id => id !== friendId)
                : [...prev, friendId]
        );
    };

    const handleShare = async () => {
        if (!item?.id) return;
        setSharing(true);

        try {
            await sharePlace(item.id, {
                visibility: selectedVisibility,
                sharedWithUserIds: selectedFriendIds,
                groupId: selectedGroupId || null,
                collaborative: isCollaborative
            });
            alert('Place sharing preferences updated!');
            onClose();
        } catch (err) {
            alert('Failed to update sharing: ' + err.message);
        } finally {
            setSharing(false);
        }
    };

    if (!isOpen) return null;

    const visibilityOptions = [
        { value: 'private', label: 'Private', icon: Lock, desc: 'Only you can see this place' },
        { value: 'friends', label: 'Friends', icon: Users, desc: 'Your friends can see this place' },
        { value: 'specific', label: 'Specific Friends', icon: User, desc: 'Only specified friends' },
        { value: 'group', label: 'Group members', icon: FolderPlus, desc: 'Share with a specific group' },
        { value: 'public', label: 'Public', icon: Globe, desc: 'Everyone can see this place' },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
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
                                    padding: '10px 12px',
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
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{label}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Specific Friends List Multi-select */}
                    {selectedVisibility === 'specific' && (
                        <div style={{ marginBottom: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                            <h4 style={{ marginBottom: '12px' }}>Select Friends:</h4>
                            {friends.length === 0 ? (
                                <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', padding: '10px' }}>
                                    You don't have any friends added yet.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                                    {friends.map(friend => {
                                        const isChecked = selectedFriendIds.includes(friend.id);
                                        return (
                                            <div
                                                key={friend.id}
                                                onClick={() => handleFriendToggle(friend.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '8px 12px',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    background: isChecked ? 'rgba(62, 166, 255, 0.05)' : 'transparent'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{friend.display_name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{friend.email}</div>
                                                </div>
                                                <div style={{
                                                    width: '20px', height: '20px', borderRadius: '4px',
                                                    border: '2px solid ' + (isChecked ? 'var(--accent)' : 'var(--border)'),
                                                    background: isChecked ? 'var(--accent)' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'white'
                                                }}>
                                                    {isChecked && <Check size={12} strokeWidth={3} />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Group Selection Dropdown */}
                    {selectedVisibility === 'group' && (
                        <div style={{ marginBottom: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                            <h4 style={{ marginBottom: '12px' }}>Select Group:</h4>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        background: 'var(--input-bg)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        color: 'var(--text)'
                                    }}
                                >
                                    <option value="">-- Select Group --</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                                <button
                                    className="secondary"
                                    onClick={() => setShowNewGroupInput(!showNewGroupInput)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 12px' }}
                                >
                                    <Plus size={16} /> New Group
                                </button>
                            </div>

                            {showNewGroupInput && (
                                <div style={{
                                    display: 'flex', gap: '6px', marginTop: '10px', padding: '10px',
                                    background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border)'
                                }}>
                                    <input
                                        type="text"
                                        placeholder="Group name..."
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        style={{
                                            flex: 1, padding: '6px 10px', border: '1px solid var(--border)',
                                            borderRadius: '6px', background: 'var(--bg)', color: 'var(--text)'
                                        }}
                                    />
                                    <button
                                        className="primary"
                                        disabled={creatingGroup || !newGroupName.trim()}
                                        onClick={handleCreateGroup}
                                        style={{ height: '32px', fontSize: '13px', padding: '0 12px' }}
                                    >
                                        Create
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Collaborative toggle — only show when sharing with someone */}
                    {selectedVisibility !== 'private' && (
                        <div
                            onClick={() => setIsCollaborative(!isCollaborative)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '10px 12px', marginBottom: '16px',
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
                        disabled={sharing || (selectedVisibility === 'group' && !selectedGroupId)}
                    >
                        {sharing ? 'Sharing...' : 'Update Sharing Options'}
                    </button>
                </div>
            </div>
        </div>
    );
}
