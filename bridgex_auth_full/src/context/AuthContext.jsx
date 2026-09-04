import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigError } from '../lib/supabase';

const AuthContext = createContext(null);

function mapUser(user) {
    if (!user) return null;

    const metadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};

    return {
        id: user.id,
        email: user.email || '',
        full_name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Student',
        avatar_url: metadata.avatar_url || metadata.picture || '',
        role: metadata.role || appMetadata.role || metadata.user_role || appMetadata.user_role || 'student',
        email_confirmed_at: user.email_confirmed_at || null,
        ...metadata,
    };
}

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(supabaseConfigError);

    useEffect(() => {
        let mounted = true;

        if (!supabase) {
            setLoading(false);
            return undefined;
        }

        const loadSession = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (!mounted) return;

            if (error) {
                setAuthError(error.message);
                setSession(null);
                setUser(null);
            } else {
                setAuthError('');
                setSession(data.session || null);
                setUser(mapUser(data.session?.user));
            }
            setLoading(false);
        };

        loadSession();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!mounted) return;
            setAuthError('');
            setSession(nextSession || null);
            setUser(mapUser(nextSession?.user));
            setLoading(false);
        });

        return () => {
            mounted = false;
            listener.subscription.unsubscribe();
        };
    }, []);

    const login = async (email, password) => {
        if (!supabase) {
            const error = new Error(supabaseConfigError);
            setAuthError(error.message);
            return { data: null, error };
        }

        setAuthError('');
        const result = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (result.error) {
            setAuthError(result.error.message);
            return result;
        }

        setSession(result.data.session || null);
        setUser(mapUser(result.data.user));
        return result;
    };

    const signup = async (email, password, fullName) => {
        if (!supabase) {
            const error = new Error(supabaseConfigError);
            setAuthError(error.message);
            return { data: null, error };
        }

        setAuthError('');
        const result = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    full_name: fullName.trim(),
                    role: 'student',
                },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (result.error) {
            setAuthError(result.error.message);
            return result;
        }

        // With email confirmation enabled, Supabase returns a user but no session.
        setSession(result.data.session || null);
        setUser(mapUser(result.data.user));
        return result;
    };

    const resetPassword = async (email) => {
        if (!supabase) {
            const error = new Error(supabaseConfigError);
            setAuthError(error.message);
            return { error };
        }

        setAuthError('');
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/auth/callback?mode=reset`,
        });

        if (result.error) setAuthError(result.error.message);
        return result;
    };

    const logout = async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) {
            setAuthError(error.message);
            return;
        }
        setSession(null);
        setUser(null);
    };

    const value = useMemo(() => ({
        user,
        session,
        accessToken: session?.access_token || null,
        loading,
        authError,
        login,
        signup,
        resetPassword,
        logout,
    }), [user, session, loading, authError]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
