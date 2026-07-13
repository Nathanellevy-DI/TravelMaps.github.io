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

    const loadSocialData = useCallback(() => {
        if (!user) return;
        
        try {
            const storedFriends = localStorage.getItem(`travelmaps_friends_${user.id}`);
            if (storedFriends) {
                setFriends(JSON.parse(storedFriends));
            } else {
                setFriends(DEFAULT_MOCK_FRIENDS);
                localStorage.setItem(`travelmaps_friends_${user.id}`, JSON.stringify(DEFAULT_MOCK_FRIENDS));
            }

            const storedRequests = localStorage.getItem(`travelmaps_requests_${user.id}`);
            if (storedRequests) {
                setPendingRequests(JSON.parse(storedRequests));
            } else {
                setPendingRequests([]);
            }

            const storedNotifications = localStorage.getItem(`travelmaps_notifications_${user.id}`);
            if (storedNotifications) {
                setNotifications(JSON.parse(storedNotifications));
            } else {
                const initialNotifications = DEFAULT_MOCK_NOTIFICATIONS.map(n => ({ ...n, user_id: user.id }));
                setNotifications(initialNotifications);
                localStorage.setItem(`travelmaps_notifications_${user.id}`, JSON.stringify(initialNotifications));
            }
        } catch (e) {
            console.error("Error loading mock social data:", e);
        }
        setIsLoading(false);
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
            const name = emailOrName.trim();
            if (!name) return { error: 'Invalid name' };

            const isEmail = name.includes('@');
            const targetEmail = isEmail ? name : name.toLowerCase().replace(/\s+/g, '') + '@example.com';
            const displayName = isEmail ? name.split('@')[0] : name;

            // Create a pending request
            const newRequest = {
                friendship_id: 'fs_' + Date.now(),
                action_user_id: 'mock_user',
                id: 'mock_user_' + Date.now(),
                display_name: displayName,
                email: targetEmail
            };

            const updatedRequests = [...pendingRequests, newRequest];
            setPendingRequests(updatedRequests);
            localStorage.setItem(`travelmaps_requests_${user.id}`, JSON.stringify(updatedRequests));

            // Auto-accept request in 3 seconds to make the app feel alive and interactive for marketing demos!
            setTimeout(() => {
                const storedRequests = JSON.parse(localStorage.getItem(`travelmaps_requests_${user.id}`) || '[]');
                const filteredRequests = storedRequests.filter(r => r.friendship_id !== newRequest.friendship_id);
                setPendingRequests(filteredRequests);
                localStorage.setItem(`travelmaps_requests_${user.id}`, JSON.stringify(filteredRequests));

                const newFriend = {
                    id: newRequest.id,
                    display_name: newRequest.display_name,
                    email: newRequest.email
                };
                const storedFriends = JSON.parse(localStorage.getItem(`travelmaps_friends_${user.id}`) || '[]');
                const updatedFriends = [newFriend, ...storedFriends];
                setFriends(updatedFriends);
                localStorage.setItem(`travelmaps_friends_${user.id}`, JSON.stringify(updatedFriends));

                // Add a notification about it
                const newNotification = {
                    id: 'n_' + Date.now(),
                    user_id: user.id,
                    actor_id: newRequest.id,
                    type: 'friend_accept',
                    message: 'accepted your friend request.',
                    is_read: false,
                    created_at: new Date().toISOString(),
                    actor: { display_name: newRequest.display_name }
                };
                const storedNotifications = JSON.parse(localStorage.getItem(`travelmaps_notifications_${user.id}`) || '[]');
                const updatedNotifications = [newNotification, ...storedNotifications];
                setNotifications(updatedNotifications);
                localStorage.setItem(`travelmaps_notifications_${user.id}`, JSON.stringify(updatedNotifications));
            }, 3000);

            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    };

    const respondToRequest = async (friendshipId, accept) => {
        if (!user) return { error: 'Not authenticated' };
        
        try {
            const request = pendingRequests.find(r => r.friendship_id === friendshipId);
            const updatedRequests = pendingRequests.filter(r => r.friendship_id !== friendshipId);
            setPendingRequests(updatedRequests);
            localStorage.setItem(`travelmaps_requests_${user.id}`, JSON.stringify(updatedRequests));

            if (accept && request) {
                const newFriend = {
                    id: request.id,
                    display_name: request.display_name,
                    email: request.email
                };
                const updatedFriends = [newFriend, ...friends];
                setFriends(updatedFriends);
                localStorage.setItem(`travelmaps_friends_${user.id}`, JSON.stringify(updatedFriends));
            }
            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    };

    const markNotificationRead = async (id) => {
        if (!user) return;
        
        try {
            const updatedNotifications = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
            setNotifications(updatedNotifications);
            localStorage.setItem(`travelmaps_notifications_${user.id}`, JSON.stringify(updatedNotifications));
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
