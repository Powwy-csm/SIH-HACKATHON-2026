import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, loading } = useAuth();
    const [message, setMessage] = useState('Finishing your authentication...');

    useEffect(() => {
        let cancelled = false;

        const finish = async () => {
            if (!supabase) {
                setMessage('Supabase authentication is not configured.');
                return;
            }

            const { data, error } = await supabase.auth.getSession();
            if (cancelled) return;

            if (error) {
                setMessage(error.message);
                return;
            }

            if (data.session) {
                if (searchParams.get('mode') === 'reset') {
                    navigate('/?mode=reset', { replace: true });
                } else {
                    navigate('/student/dashboard', { replace: true });
                }
                return;
            }

            setMessage('Your email has been confirmed. You can now sign in to BridgeX.');
            setTimeout(() => {
                if (!cancelled) navigate('/', { replace: true });
            }, 1800);
        };

        finish();
        return () => {
            cancelled = true;
        };
    }, [navigate, searchParams]);

    useEffect(() => {
        if (!loading && user && searchParams.get('mode') !== 'reset') {
            navigate('/student/dashboard', { replace: true });
        }
    }, [loading, user, navigate, searchParams]);

    return (
        <div className="login-container">
            <div className="login-form-wrapper" style={{ width: '100%' }}>
                <div className="form-container" style={{ textAlign: 'center' }}>
                    <div className="mobile-brand" style={{ display: 'flex', justifyContent: 'center' }}>
                        <i className="ph-fill ph-buildings"></i>
                        <span>BridgeX</span>
                    </div>
                    <div className="form-header">
                        <h1>Authentication</h1>
                        <p>{message}</p>
                    </div>
                    <button className="btn-submit" type="button" onClick={() => navigate('/')}>Back to Sign In</button>
                </div>
            </div>
        </div>
    );
}
