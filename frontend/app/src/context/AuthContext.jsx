import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

function isStaleSessionError(error) {
    const message = (error && (error.message || String(error))) || '';
    return /session_not_found|session.*does not exist|invalid.*session|expired.*session|jwt/i.test(message);
}

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(supabaseConfigError);
    const loginInProgressRef = useRef(false);

    useEffect(() => {
        let mounted = true;

        if (!supabase) {
            setLoading(false);
            return undefined;
        }

        const fetchProfileRole = async (userId) => {
            if (!supabase || !userId) return null;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', userId)
                    .maybeSingle();
                if (error || !data) return null;
                return data.role || null;
            } catch {
                return null;
            }
        };

        const fetchStudentOnboardingStatus = async (userId) => {
            if (!supabase || !userId) return false;
            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('onboarding_completed')
                    .eq('id', userId)
                    .maybeSingle();
                if (error || !data) return false;
                return !!data.onboarding_completed;
            } catch {
                return false;
            }
        };

        const enrichUser = async (baseUser) => {
            if (!baseUser) return null;
            const profileRole = await fetchProfileRole(baseUser.id);
            if (profileRole) {
                baseUser.role = profileRole;
            }

            const roleOverride = localStorage.getItem('bridgex_role_override');
            if (roleOverride) {
                baseUser.role = roleOverride;
            }

            const role = String(baseUser.role || '').toLowerCase();
            if (role.includes('student') || role === '') {
                const onboardingCompleted = await fetchStudentOnboardingStatus(baseUser.id);
                baseUser.onboarding_completed = onboardingCompleted;
            }
            return baseUser;
        };

        const loadSession = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (!mounted) return;

            if (error) {
                const message = error.message || String(error);
                if (isStaleSessionError(error)) {
                    try {
                        await supabase.auth.signOut();
                    } catch {
                        // Ignore sign-out errors from stale/invalid sessions.
                    }
                    setAuthError('');
                    setSession(null);
                    setUser(null);
                } else {
                    setAuthError(message);
                    setSession(null);
                    setUser(null);
                }
            } else {
                setAuthError('');
                setSession(data.session || null);
                const baseUser = mapUser(data.session?.user);
                const enriched = await enrichUser(baseUser);
                if (mounted) {
                    setUser(enriched);
                }
            }
            if (mounted) setLoading(false);
        };

        loadSession();

        const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
            if (!mounted) return;
            // Skip processing if login() is currently handling this auth event.
            // login() sets the user with the correct role (including intendedRole override).
            // If we process here too, we'd overwrite it with the wrong role from profiles.
            if (loginInProgressRef.current) return;
            setAuthError('');
            setSession(nextSession || null);
            const baseUser = mapUser(nextSession?.user);
            const enriched = await enrichUser(baseUser);
            if (mounted) {
                setUser(enriched);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            listener.subscription.unsubscribe();
        };
    }, []);

    const refreshUser = async () => {
        if (!supabase) return null;
        try {
            const { data: { user: authUser }, error } = await supabase.auth.getUser();
            if (error) {
                if (isStaleSessionError(error)) {
                    await supabase.auth.signOut();
                    setSession(null);
                    setUser(null);
                    setAuthError('');
                    return null;
                }
                throw error;
            }
            if (!authUser) return null;

            const mapped = mapUser(authUser);

            // Fetch authoritative role from profiles table
            const { data: profileData } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', authUser.id)
                .maybeSingle();
            if (profileData?.role) {
                mapped.role = profileData.role;
            }

            const role = String(mapped.role || '').toLowerCase();
            if (role.includes('student') || role === '') {
                const { data } = await supabase
                    .from('students')
                    .select('onboarding_completed')
                    .eq('id', authUser.id)
                    .maybeSingle();
                mapped.onboarding_completed = !!(data?.onboarding_completed);
            }

            setUser(mapped);
            return mapped;
        } catch (err) {
            console.warn('Could not refresh user:', err);
            return null;
        }
    };

    const login = async (email, password, intendedRole) => {
        if (!supabase) {
            const error = new Error(supabaseConfigError);
            setAuthError(error.message);
            return { data: null, error };
        }

        setAuthError('');
        // Set flag to prevent onAuthStateChange from overwriting user state
        // with stale role data while login() is still resolving
        loginInProgressRef.current = true;

        const result = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (result.error) {
            loginInProgressRef.current = false;
            setAuthError(result.error.message);
            return result;
        }

        setSession(result.data.session || null);

        // Fetch authoritative role from profiles table before setting user
        const mapped = mapUser(result.data.user);
        try {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', result.data.user.id)
                .maybeSingle();
            if (profileData?.role) {
                mapped.role = profileData.role;
            }
        } catch {
            // Fall back to metadata role
        }

        // If the user logged in via a portal-specific URL (e.g. /login/industry),
        // and the profiles table still has 'student' (a known data issue from
        // the original trigger hardcoding role='student'), use the intended role.
        if (intendedRole) {
            mapped.role = intendedRole;
            localStorage.setItem('bridgex_role_override', intendedRole);
            try {
                await supabase.from('profiles').update({ role: intendedRole }).eq('id', result.data.user.id);
            } catch {
                // ignore if RLS blocks profile role update
            }
            try {
                await supabase.auth.updateUser({ data: { role: intendedRole } });
            } catch {
                // ignore if auth update fails
            }
        }

        const role = String(mapped.role || '').toLowerCase();
        if (role.includes('student') || role === '') {
            try {
                const { data: studentData } = await supabase
                    .from('students')
                    .select('onboarding_completed')
                    .eq('id', result.data.user.id)
                    .maybeSingle();
                mapped.onboarding_completed = !!(studentData?.onboarding_completed);
            } catch {
                mapped.onboarding_completed = false;
            }
        }

        setUser(mapped);
        loginInProgressRef.current = false;
        return { ...result, user: mapped };
    };

    const signup = async (email, password, fullName, role = 'student') => {
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
                    role: role,
                },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (result.error) {
            setAuthError(result.error.message);
            return result;
        }

        if (role && role !== 'student') {
            localStorage.setItem('bridgex_role_override', role);
        }

        // With email confirmation enabled, Supabase returns a user but no session.
        setSession(result.data.session || null);
        const mapped = mapUser(result.data.user);
        if (role) mapped.role = role;
        setUser(mapped);
        return { ...result, user: mapped };
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

    const loginWithGoogle = async () => {
        if (!supabase) {
            const error = new Error(supabaseConfigError || 'Supabase not configured.');
            setAuthError(error.message);
            return { error };
        }
        setAuthError('');
        const result = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (result.error) {
            setAuthError(result.error.message);
        }
        return result;
    };

    const logout = async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) {
            setAuthError(error.message);
            return;
        }
        localStorage.removeItem('bridgex_role_override');
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
        loginWithGoogle,
        logout,
        refreshUser,
    }), [user, session, loading, authError]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
