import { useState, useEffect } from 'react';
import { X, Search, UserPlus, UserMinus, Check, XCircle, Users } from 'lucide-react';
import * as friendService from '../../services/friendService';

export default function FriendsModal({ isOpen, onClose, user }) {
    const [activeTab, setActiveTab] = useState('search'); // 'search', 'friends', 'pending'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState({ incoming: [], outgoing: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadFriends();
            loadPendingRequests();
        }
    }, [isOpen]);

    const loadFriends = async () => {
        try {
            const data = await friendService.getFriends();
            setFriends(data || []);
        } catch (err) {
            console.error('Failed to load friends:', err);
            setFriends([]);
        }
    };

    const loadPendingRequests = async () => {
        try {
            const data = await friendService.getPendingRequests();
            setPendingRequests(data || { incoming: [], outgoing: [] });
        } catch (err) {
            console.error('Failed to load pending requests:', err);
            setPendingRequests({ incoming: [], outgoing: [] });
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError('');
        try {
            const results = await friendService.searchUsers(searchQuery);
            setSearchResults(results);
        } catch (err) {
            setError('Search failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async (friendId) => {
        try {
            await friendService.sendFriendRequest(friendId);
            setSearchResults(searchResults.filter(u => u.id !== friendId));
            loadPendingRequests();
            alert('Friend request sent!');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to send friend request');
        }
    };

    const handleAcceptRequest = async (friendshipId) => {
        try {
            await friendService.acceptFriendRequest(friendshipId);
            loadFriends();
            loadPendingRequests();
        } catch (err) {
            alert('Failed to accept request');
        }
    };

    const handleRejectRequest = async (friendshipId) => {
        try {
            await friendService.rejectFriendRequest(friendshipId);
            loadPendingRequests();
        } catch (err) {
            alert('Failed to reject request');
        }
    };

    const handleRemoveFriend = async (friendshipId) => {
        if (!confirm('Are you sure you want to remove this friend?')) return;

        try {
            await friendService.removeFriend(friendshipId);
            loadFriends();
        } catch (err) {
            alert('Failed to remove friend');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h3><Users size={20} /> Friends</h3>
                    <button className="icon-btn" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 22px' }}>
                    <button
                        onClick={() => setActiveTab('search')}
                        style={{
                            padding: '12px 20px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'search' ? '2px solid var(--accent)' : '2px solid transparent',
                            color: activeTab === 'search' ? 'var(--accent)' : 'var(--muted)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px'
                        }}
                    >
                        Search Users
                    </button>
                    <button
                        onClick={() => setActiveTab('friends')}
                        style={{
                            padding: '12px 20px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'friends' ? '2px solid var(--accent)' : '2px solid transparent',
                            color: activeTab === 'friends' ? 'var(--accent)' : 'var(--muted)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px'
                        }}
                    >
                        Friends ({friends.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        style={{
                            padding: '12px 20px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'pending' ? '2px solid var(--accent)' : '2px solid transparent',
                            color: activeTab === 'pending' ? 'var(--accent)' : 'var(--muted)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px'
                        }}
                    >
                        Pending ({pendingRequests.incoming.length + pendingRequests.outgoing.length})
                    </button>
                </div>

                <div className="modal-body">
                    {/* Search Tab */}
                    {activeTab === 'search' && (
                        <div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <input
                                    type="text"
                                    placeholder="Search by username or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--input-bg)',
                                        color: 'var(--text-main)',
                                        fontSize: '14px'
                                    }}
                                />
                                <button className="primary" onClick={handleSearch} disabled={loading}>
                                    <Search size={16} /> Search
                                </button>
                            </div>

                            {error && <div style={{ color: '#ff6961', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {searchResults.map(user => (
                                    <div key={user.id} className="saved-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.displayName || user.username}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>@{user.username}</div>
                                        </div>
                                        <button className="small-btn" onClick={() => handleSendRequest(user.id)}>
                                            <UserPlus size={14} /> Add
                                        </button>
                                    </div>
                                ))}
                                {searchResults.length === 0 && searchQuery && !loading && (
                                    <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>
                                        No users found
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Friends Tab */}
                    {activeTab === 'friends' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {friends.map(({ friendshipId, friend }) => (
                                <div key={friendshipId} className="saved-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{friend.displayName || friend.username}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>@{friend.username}</div>
                                    </div>
                                    <button className="small-btn danger" onClick={() => handleRemoveFriend(friendshipId)}>
                                        <UserMinus size={14} /> Remove
                                    </button>
                                </div>
                            ))}
                            {friends.length === 0 && (
                                <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>
                                    No friends yet. Search for users to add!
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pending Tab */}
                    {activeTab === 'pending' && (
                        <div>
                            {pendingRequests.incoming.length > 0 && (
                                <div style={{ marginBottom: '20px' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-main)' }}>
                                        Incoming Requests
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {pendingRequests.incoming.map(({ friendshipId, user }) => (
                                            <div key={friendshipId} className="saved-card" style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.displayName || user.username}</div>
                                                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>@{user.username}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button className="small-btn" style={{ background: '#2d5016', borderColor: '#4a8020', color: '#90ee90' }} onClick={() => handleAcceptRequest(friendshipId)}>
                                                            <Check size={14} /> Accept
                                                        </button>
                                                        <button className="small-btn danger" onClick={() => handleRejectRequest(friendshipId)}>
                                                            <XCircle size={14} /> Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {pendingRequests.outgoing.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-main)' }}>
                                        Outgoing Requests
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {pendingRequests.outgoing.map(({ friendshipId, user }) => (
                                            <div key={friendshipId} className="saved-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.displayName || user.username}</div>
                                                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>@{user.username} • Pending</div>
                                                </div>
                                                <button className="small-btn" onClick={() => handleRejectRequest(friendshipId)}>
                                                    Cancel
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {pendingRequests.incoming.length === 0 && pendingRequests.outgoing.length === 0 && (
                                <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>
                                    No pending requests
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
