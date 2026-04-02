import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only initialize the client if the URL is valid, otherwise provide a dummy object
export const supabase = supabaseUrl 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : {
        auth: {
            getSession: () => Promise.resolve({ data: { session: null } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        },
        from: () => ({
            select: () => Promise.resolve({ data: [], error: { message: "Supabase not connected" } }),
        }),
        channel: () => ({
            on: () => ({ subscribe: () => {} }),
        }),
        removeChannel: () => {}
    };

export const isSupabaseConfigured = !!supabaseUrl;
