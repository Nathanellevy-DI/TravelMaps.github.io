import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const SocialContext = createContext();

const DEFAULT_MOCK_FRIENDS = [
    { id: 'f1', display_name: 'Sarah traveler', email: 'sarah@example.com' },
    { id: 'f2', display_name: 'Explorer John', email: 'john@example.com' }
];

const DEFAULT_MOCK_NOTIFICATIONS = [
    {
        id: 'n1',
        user_id: '',
        actor_id: 'f1',
        type: 'friend_accept',
        message: 'accepted your friend request.',
        is_read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        actor: { display_name: 'Sarah traveler' }
    }
];

export function SocialProvider({ children }) {
    const { user } = useAuth();
    
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadSocialData = useCallback(async () => {
        if (!user) return;
        
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            
            const [friendsRes, notificationsRes] = await Promise.all([
                fetch(`${apiUrl}/api/friends`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/api/notifications`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (friendsRes.ok) {
                const friendsData = await friendsRes.json();
                setFriends(friendsData.friends || []);
                setPendingRequests(friendsData.pendingRequests || []);
            }

            if (notificationsRes.ok) {
                const notificationsData = await notificationsRes.json();
                setNotifications(notificationsData || []);
            }
        } catch (e) {
            console.error("Error loading social data:", e);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadSocialData();
        } else {
            setFriends([]);
            setPendingRequests([]);
            setNotifications([]);
        }
    }, [user, loadSocialData]);

    const sendFriendRequest = async (emailOrName) => {
        if (!user) return { error: 'Not authenticated' };
        
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            const response = await fetch(`${apiUrl}/api/friends/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetEmailOrName: emailOrName.trim() })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to send friend request');
            }

            await loadSocialData(); // Refresh local list
            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    };

    const respondToRequest = async (friendshipId, accept) => {
        if (!user) return { error: 'Not authenticated' };
        
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            const response = await fetch(`${apiUrl}/api/friends/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ friendshipId, accept })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to respond to request');
            }

            await loadSocialData(); // Refresh local list
            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    };

    const markNotificationRead = async (id) => {
        if (!user) return;
        
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const token = localStorage.getItem('travelmaps_token');
            const response = await fetch(`${apiUrl}/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const value = {
        friends,
        pendingRequests,
        notifications,
        isLoading,
        sendFriendRequest,
        respondToRequest,
        markNotificationRead,
        refresh: loadSocialData
    };

    return (
        <SocialContext.Provider value={value}>
            {children}
        </SocialContext.Provider>
    );
}

export function useSocial() {
    const context = useContext(SocialContext);
    if (!context) throw new Error('useSocial must be used within a SocialProvider');
    return context;
}

export default SocialContext;
