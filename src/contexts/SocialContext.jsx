import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchApi, SOCKET_URL } from '../services/apiClient';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocialContext = createContext();

export function SocialProvider({ children }) {
    const { user } = useAuth();
    
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFriendsAndRequests = useCallback(async () => {
        if (!user) return;
        
        try {
            const data = await fetchApi('/friends');
            setFriends(data.friends || []);
            setPendingRequests(data.pendingRequests || []);
        } catch (error) {
            console.error("Error fetching social data:", error);
        }
    }, [user]);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const data = await fetchApi('/notifications');
            setNotifications(data || []);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            Promise.all([fetchFriendsAndRequests(), fetchNotifications()]).finally(() => {
                setIsLoading(false);
            });

            const newSocket = io(SOCKET_URL, { query: { userId: user.id } });
            
            newSocket.on('friends_update', fetchFriendsAndRequests);
            newSocket.on('notification_update', fetchNotifications);

            return () => newSocket.disconnect();
        } else {
            setFriends([]);
            setPendingRequests([]);
            setNotifications([]);
        }
    }, [user, fetchFriendsAndRequests, fetchNotifications]);

    const sendFriendRequest = async (emailOrName) => {
        try {
            await fetchApi('/friends/request', {
                method: 'POST',
                body: JSON.stringify({ targetEmailOrName: emailOrName })
            });
            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    };

    const respondToRequest = async (friendshipId, accept) => {
        try {
            await fetchApi('/friends/respond', {
                method: 'POST',
                body: JSON.stringify({ friendshipId, accept })
            });
            fetchFriendsAndRequests();
            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    };

    const markNotificationRead = async (id) => {
        try {
            await fetchApi(`/notifications/${id}/read`, { method: 'PUT' });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
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
        refresh: () => {
            fetchFriendsAndRequests();
            fetchNotifications();
        }
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
