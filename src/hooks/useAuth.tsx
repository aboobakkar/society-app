import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    signIn: (
        email: string,
        password: string,
    ) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    isAdmin: boolean;
    isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_CACHE_KEY = 'mh_profile';

function getCachedProfile(): Profile | null {
    try {
        const raw = localStorage.getItem(PROFILE_CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function setCachedProfile(p: Profile | null) {
    try {
        if (p) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
        else localStorage.removeItem(PROFILE_CACHE_KEY);
    } catch {}
}

async function fetchProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) return null;
    return data as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    // Initialise profile from cache — so on refresh it's available immediately
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(getCachedProfile);
    const [session, setSession] = useState<Session | null>(null);

    // If we have a cached profile, start with loading=false
    const [loading, setLoading] = useState(() => getCachedProfile() === null);

    useEffect(() => {
        let active = true;

        async function init() {
            // Get session synchronously from localStorage (Supabase stores it there)
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!active) return;

            if (!session) {
                // No session — clear cache and stop loading
                setCachedProfile(null);
                setProfile(null);
                setSession(null);
                setUser(null);
                setLoading(false);
                return;
            }

            setSession(session);
            setUser(session.user);

            // If cached profile matches current user — use it immediately
            const cached = getCachedProfile();
            if (cached && cached.id === session.user.id) {
                setProfile(cached);
                setLoading(false);
                // Refresh in background silently
                fetchProfile(session.user.id).then((fresh) => {
                    if (fresh && active) {
                        setProfile(fresh);
                        setCachedProfile(fresh);
                    }
                });
            } else {
                // No cache or different user — must fetch before showing app
                const p = await fetchProfile(session.user.id);
                if (!active) return;
                setProfile(p);
                setCachedProfile(p);
                setLoading(false);
            }
        }

        init();

        // Listen for sign in / sign out events after initial load
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'INITIAL_SESSION') return; // handled by init()

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                const p = await fetchProfile(session.user.id);
                if (!active) return;
                setProfile(p);
                setCachedProfile(p);
            } else {
                setProfile(null);
                setCachedProfile(null);
            }
            setLoading(false);
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) return { error: error.message };
        return { error: null };
    };

    const signOut = async () => {
        setCachedProfile(null);
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
    };

    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
    const isSuperAdmin = profile?.role === 'superadmin';

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                session,
                loading,
                signIn,
                signOut,
                isAdmin,
                isSuperAdmin,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
