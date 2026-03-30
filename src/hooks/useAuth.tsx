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
    isAgent: boolean;
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
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) return null;
        return data as Profile;
    } catch (e) {
        console.error('[fetchProfile] error:', e);
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(getCachedProfile);
    const [session, setSession] = useState<Session | null>(null);
    // Start loading=true always. INITIAL_SESSION fires very fast (next tick),
    // so the spinner is barely visible. This avoids any race with cached state.
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        // onAuthStateChange is the SINGLE source of truth.
        // INITIAL_SESSION always fires on mount — even on hard page refresh.
        // We no longer call getSession() separately; that was the source of hangs
        // when the token refresh network call took too long or failed.
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, sess) => {
            if (cancelled) return;

            setSession(sess);
            setUser(sess?.user ?? null);

            if (!sess) {
                // Signed out or no session at all
                setProfile(null);
                setCachedProfile(null);
                setLoading(false);
                return;
            }

            // Check the local cache first for an instant response
            const cached = getCachedProfile();
            if (cached && cached.id === sess.user.id) {
                setProfile(cached);
                setLoading(false);
                // Silently refresh in background so data stays fresh
                fetchProfile(sess.user.id).then((fresh) => {
                    if (fresh && !cancelled) {
                        setProfile(fresh);
                        setCachedProfile(fresh);
                    }
                });
            } else {
                // No cache (first login) — must fetch before showing app
                try {
                    const p = await fetchProfile(sess.user.id);
                    if (cancelled) return;
                    setProfile(p);
                    setCachedProfile(p);
                } catch (e) {
                    console.error('[AuthProvider] fetchProfile failed:', e);
                } finally {
                    if (!cancelled) setLoading(false);
                }
            }
        });

        return () => {
            cancelled = true;
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
    const isAgent = profile?.role === 'agent';

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
                isAgent,
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
