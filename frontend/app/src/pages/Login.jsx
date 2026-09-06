import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

function getRolePath(user) {
    const role = String(user?.role || '').toLowerCase();
    if (role.includes('faculty') || role.includes('academic') || role.includes('institution')) {
        return '/institution/dashboard';
    }
    if (role.includes('industry') || role.includes('company') || role.includes('employer')) {
        return '/industry/dashboard';
    }
    if (user?.onboarding_completed === false) {
        return '/student/onboarding';
    }
    return '/student/dashboard';
}

function getPortalTitle(roleParam) {
    const role = String(roleParam || '').toLowerCase();
    if (role.includes('institution') || role.includes('academician') || role.includes('faculty')) {
        return { heading: 'Institution Sign In', sub: 'Sign in to access your campus analytics and student tracking.' };
    }
    if (role.includes('industry') || role.includes('company')) {
        return { heading: 'Industry Sign In', sub: 'Sign in to access talent discovery and placement opportunities.' };
    }
    if (role.includes('student')) {
        return { heading: 'Student Sign In', sub: 'Sign in to access your verified skills and opportunities.' };
    }
    return { heading: 'Welcome back', sub: 'Sign in with your BridgeX account.' };
}

export default function Login() {
    const params = useParams();
    const urlRole = params.portalRole || params.role || '';
    const [mode, setMode] = useState('signin');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loadingAction, setLoadingAction] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading: authLoading, authError, login, signup, resetPassword } = useAuth();

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('mode') === 'reset') {
            setMode('reset');
            setMessage('Enter your email and we will send you a password reset link.');
        }
    }, [location.search]);

    const switchMode = (nextMode) => {
        setMode(nextMode);
        setError('');
        setMessage('');
        setPassword('');
        setConfirmPassword('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setMessage('');
        setLoadingAction(true);

        try {
            if (mode === 'signup') {
                if (password.length < 6) {
                    setError('Password must be at least 6 characters.');
                    return;
                }
                if (password !== confirmPassword) {
                    setError('Passwords do not match.');
                    return;
                }

                const result = await signup(email, password, fullName, urlRole || 'student');
                if (result.error) {
                    setError(result.error.message || 'Unable to create your account.');
                    return;
                }

                if (result.data?.session) {
                    const target = getRolePath(result.user || { role: urlRole || 'student' });
                    navigate(target, { replace: true });
                } else {
                    setMessage('Account created. Check your email and click the verification link before signing in.');
                    setMode('signin');
                    setPassword('');
                    setConfirmPassword('');
                }
                return;
            }

            if (mode === 'reset') {
                const result = await resetPassword(email);
                if (result.error) {
                    setError(result.error.message || 'Unable to send the reset email.');
                    return;
                }
                setMessage('Password reset email sent. Check your inbox and follow the link.');
                return;
            }

            const result = await login(email, password, urlRole || undefined);
            if (result.error) {
                setError(result.error.message || 'Unable to sign in. Please check your credentials.');
                return;
            }

            const target = getRolePath(result.user || { role: urlRole || 'student' });
            navigate(target, { replace: true });
        } catch (submitError) {
            setError(submitError.message || 'Something went wrong. Please try again.');
        } finally {
            setLoadingAction(false);
        }
    };

    const visibleError = error || authError;
    const portalMeta = getPortalTitle(urlRole);

    const heading = mode === 'signup' ? 'Create your BridgeX account' : mode === 'reset' ? 'Reset your password' : portalMeta.heading;
    const subheading = mode === 'signup'
        ? 'Create a verified account to access your BridgeX workspace.'
        : mode === 'reset'
            ? 'We will send a secure password reset link to your email.'
            : portalMeta.sub;

    return (
        <div className="login-container">
            <div className="login-visual">
                <div className="brand-logo">
                    <i className="ph-fill ph-buildings"></i>
                    <span>BridgeX</span>
                </div>
                <div className="visual-content">
                    <h2>Bridging the gap between academia and industry.</h2>
                    <p>A unified platform for skill mapping, internships, and placements.</p>
                    <div className="feature-pills">
                        <span><i className="ph ph-check-circle"></i> AI Skill Mapping</span>
                        <span><i className="ph ph-check-circle"></i> Verified Portfolios</span>
                        <span><i className="ph ph-check-circle"></i> Live Collaborations</span>
                    </div>
                </div>
            </div>

            <div className="login-form-wrapper">
                <div className="form-container">
                    <div className="mobile-brand">
                        <i className="ph-fill ph-buildings"></i>
                        <span>BridgeX</span>
                    </div>

                    <div className="form-header">
                        <h1>{heading}</h1>
                        <p>{subheading}</p>
                    </div>

                    {mode !== 'reset' && (
                        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
                            <button type="button" className={mode === 'signin' ? 'auth-tab active' : 'auth-tab'} onClick={() => switchMode('signin')}>Sign In</button>
                            <button type="button" className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'} onClick={() => switchMode('signup')}>Create Account</button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {mode === 'signup' && (
                            <div className="input-group">
                                <label>Full name</label>
                                <div className="input-wrapper">
                                    <i className="ph ph-user"></i>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(event) => setFullName(event.target.value)}
                                        placeholder="Your full name"
                                        autoComplete="name"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="input-group">
                            <label>Email address</label>
                            <div className="input-wrapper">
                                <i className="ph ph-envelope-simple"></i>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="name@example.com"
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        {mode !== 'reset' && (
                            <>
                                <div className="input-group">
                                    <label>Password</label>
                                    <div className="input-wrapper">
                                        <i className="ph ph-lock-key"></i>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            placeholder="••••••••"
                                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                            required
                                        />
                                    </div>
                                </div>

                                {mode === 'signup' && (
                                    <div className="input-group">
                                        <label>Confirm password</label>
                                        <div className="input-wrapper">
                                            <i className="ph ph-lock-key-open"></i>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(event) => setConfirmPassword(event.target.value)}
                                                placeholder="••••••••"
                                                autoComplete="new-password"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {mode === 'signin' && (
                            <div className="form-options">
                                <label className="remember-me">
                                    <input type="checkbox" defaultChecked />
                                    <span>Keep me signed in</span>
                                </label>
                                <button type="button" className="forgot-password button-link" onClick={() => switchMode('reset')}>Forgot password?</button>
                            </div>
                        )}

                        {message && (
                            <div className="success-message">
                                <i className="ph-fill ph-check-circle"></i>
                                <span>{message}</span>
                            </div>
                        )}

                        {visibleError && (
                            <div className="error-message">
                                <i className="ph-fill ph-warning-circle"></i>
                                <span>{visibleError}</span>
                            </div>
                        )}

                        <button type="submit" className="btn-submit" disabled={loadingAction || authLoading}>
                            {loadingAction ? 'Please wait...' : mode === 'signup' ? 'Create Account' : mode === 'reset' ? 'Send Reset Email' : 'Sign In'}
                        </button>
                    </form>

                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                        <Link to="/" style={{ fontSize: '13px', color: '#64748B', textDecoration: 'none' }}>
                            &larr; Switch Portal
                        </Link>
                    </div>

                    {mode === 'reset' && (
                        <button type="button" className="back-auth-link" onClick={() => switchMode('signin')}>
                            ← Back to Sign In
                        </button>
                    )}

                    {mode === 'signup' && (
                        <p className="auth-note">New accounts are created as student accounts. Email verification is handled by Supabase Auth.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
