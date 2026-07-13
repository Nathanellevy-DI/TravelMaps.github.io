/**
 * FriendsModal.jsx — Friend Management Modal (Supabase Integrated)
 */
import { useState } from 'react';
import { X, Search, UserPlus, UserMinus, Check, XCircle, Users } from 'lucide-react';
import { useSocial } from '../../contexts/SocialContext';

export default function FriendsContent({ user }) {
    const { 
        friends, 
        pendingRequests, 
        isLoading, 
        sendFriendRequest, 
        respondToRequest,
        refresh
    } = useSocial();

    const [activeTab, setActiveTab] = useState('search'); 
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setLoadingSearch(true);
        setError('');
        
        try {
            // Read local users list
            const allUsers = JSON.parse(localStorage.getItem('travelmaps_users') || '[]');
            const query = searchQuery.toLowerCase();
            const matchingUsers = allUsers.filter(u => 
                (u.email.toLowerCase().includes(query) || u.name.toLowerCase().includes(query)) &&
                u.id !== user?.id
            ).map(u => ({
                id: u.id,
                display_name: u.name,
                email: u.email
            }));

            const existingFriendIds = friends.map(f => f.id);
            setSearchResults(matchingUsers.filter(u => !existingFriendIds.includes(u.id)));
        } catch (err) {
            setError('Search failed. Please try again.');
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleSendRequest = async (emailOrName) => {
        const result = await sendFriendRequest(emailOrName);
        if (result.error) {
            alert(result.error);
        } else {
            setSearchResults(searchResults.filter(u => u.email !== emailOrName && u.display_name !== emailOrName));
            alert('Friend request sent!');
            refresh();
        }
    };

    const incomingRequests = pendingRequests.filter(req => req.user_id_2 === user?.id || req.action_user_id !== user?.id);
    const outgoingRequests = pendingRequests.filter(req => req.action_user_id === user?.id);

    return (
        <div className="friends-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

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
                        Pending ({incomingRequests.length + outgoingRequests.length})
                    </button>
                </div>

                <div className="modal-body">
                    {/* Search Tab */}
                    {activeTab === 'search' && (
                        <div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
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
                                <button className="primary" onClick={handleSearch} disabled={loadingSearch}>
                                    <Search size={16} /> Search
                                </button>
                            </div>

                            {error && <div style={{ color: '#ff6961', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {searchResults.map(u => (
                                    <div key={u.id} className="saved-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.display_name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                                        </div>
                                        <button className="small-btn" style={{ flexShrink: 0 }} onClick={() => handleSendRequest(u.email)}>
                                            <UserPlus size={14} /> Add
                                        </button>
                                    </div>
                                ))}
                                {searchResults.length === 0 && searchQuery && !loadingSearch && (
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
                            {friends.map((friend) => (
                                <div key={friend.id} className="saved-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{friend.display_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{friend.email}</div>
                                    </div>
                                    <button className="small-btn danger" style={{ flexShrink: 0 }} onClick={() => respondToRequest(friend.friendship_id, false)}>
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
                            {incomingRequests.length > 0 && (
                                <div style={{ marginBottom: '20px' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-main)' }}>
                                        Incoming Requests
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {incomingRequests.map((req) => (
                                            <div key={req.friendship_id} className="saved-card" style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.display_name}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.email}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                                        <button className="small-btn" style={{ background: '#2d5016', borderColor: '#4a8020', color: '#90ee90' }} onClick={() => respondToRequest(req.friendship_id, true)}>
                                                            <Check size={14} /> Accept
                                                        </button>
                                                        <button className="small-btn danger" onClick={() => respondToRequest(req.friendship_id, false)}>
                                                            <XCircle size={14} /> Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {outgoingRequests.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-main)' }}>
                                        Outgoing Requests
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {outgoingRequests.map((req) => (
                                            <div key={req.friendship_id} className="saved-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.display_name}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.email} • Pending</div>
                                                </div>
                                                <button className="small-btn" style={{ flexShrink: 0 }} onClick={() => respondToRequest(req.friendship_id, false)}>
                                                    Cancel
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                                <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>
                                    No pending requests
                                </div>
                            )}
                        </div>
                    )}
                </div>
        </div>
    );
}
