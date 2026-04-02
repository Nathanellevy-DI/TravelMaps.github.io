import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
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
            // Fetch accepted friends
            const { data: acceptedData, error: acceptedError } = await supabase
                .from('friends')
                .select(`
                    id, 
                    user_id_1, 
                    user_id_2, 
                    status,
                    profile1:profiles!user_id_1(id, display_name, email),
                    profile2:profiles!user_id_2(id, display_name, email)
                `)
                .eq('status', 'accepted')
                .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);
                
            if (acceptedError) throw acceptedError;
            
            // Map the data to show the 'other' user profile
            const mappedFriends = (acceptedData || []).map(f => {
                const profile = f.user_id_1 === user.id ? f.profile2 : f.profile1;
                return { friendship_id: f.id, ...profile };
            });
            setFriends(mappedFriends);

            // Fetch pending requests where the current user is the recipient
            // Since action_user_id is who SENT the request, we want whereaction_user_id != user.id
            const { data: pendingData, error: pendingError } = await supabase
                .from('friends')
                .select(`
                    id, 
                    action_user_id,
                    profile1:profiles!user_id_1(id, display_name, email),
                    profile2:profiles!user_id_2(id, display_name, email)
                `)
                .eq('status', 'pending')
                .neq('action_user_id', user.id)
                .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);
                
            if (pendingError) throw pendingError;
            
            const mappedRequests = (pendingData || []).map(f => {
                const profile = f.action_user_id === f.profile1.id ? f.profile1 : f.profile2;
                return { friendship_id: f.id, ...profile };
            });
            setPendingRequests(mappedRequests);

        } catch (error) {
            console.error("Error fetching social data:", error);
        }
    }, [user]);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*, actor:profiles!actor_id(display_name)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
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

            // Set up real-time subscriptions
            const friendsSub = supabase.channel('friends_channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => {
                    fetchFriendsAndRequests();
                }).subscribe();
                
            const notificationsSub = supabase.channel('notifications_channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
                    fetchNotifications();
                }).subscribe();

            return () => {
                supabase.removeChannel(friendsSub);
                supabase.removeChannel(notificationsSub);
            };
        } else {
            setFriends([]);
            setPendingRequests([]);
            setNotifications([]);
        }
    }, [user, fetchFriendsAndRequests, fetchNotifications]);

    const sendFriendRequest = async (emailOrName) => {
        try {
            // Find user id by email or name
            const { data: targetUsers, error: searchError } = await supabase
                .from('profiles')
                .select('id')
                .or(`email.ilike.${emailOrName},display_name.ilike.%${emailOrName}%`)
                .neq('id', user.id)
                .limit(1);
                
            if (searchError) throw searchError;
            if (!targetUsers || targetUsers.length === 0) return { error: "User not found" };
            
            const targetId = targetUsers[0].id;
            
            // Create friendship
            const { error: insertError } = await supabase
                .from('friends')
                .insert({
                    user_id_1: user.id,
                    user_id_2: targetId,
                    action_user_id: user.id,
                    status: 'pending'
                });
                
            if (insertError) {
                if (insertError.code === '23505') return { error: "Request already sent or friends" };
                throw insertError;
            }
            
            // Notify target user
            await supabase.from('notifications').insert({
                user_id: targetId,
                actor_id: user.id,
                type: 'friend_request',
                message: 'sent you a friend request.'
            });

            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    };

    const respondToRequest = async (friendshipId, accept) => {
        try {
            if (accept) {
                const { error } = await supabase
                    .from('friends')
                    .update({ status: 'accepted' })
                    .eq('id', friendshipId);
                if (error) throw error;
                
                // Get friendship data to notify the other person
                const { data: fd } = await supabase.from('friends').select('user_id_1, user_id_2').eq('id', friendshipId).single();
                if (fd) {
                    const targetId = fd.user_id_1 === user.id ? fd.user_id_2 : fd.user_id_1;
                    await supabase.from('notifications').insert({
                        user_id: targetId,
                        actor_id: user.id,
                        type: 'friend_accept',
                        message: 'accepted your friend request.'
                    });
                }
            } else {
                const { error } = await supabase
                    .from('friends')
                    .delete()
                    .eq('id', friendshipId);
                if (error) throw error;
            }
            fetchFriendsAndRequests();
            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    };

    const markNotificationRead = async (id) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
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
