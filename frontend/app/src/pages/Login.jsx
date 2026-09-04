import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/login.css'; // Create this file and paste your login.css into it

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const mockCredentials = {
        student: { email: 'student@ssn.edu.in', password: 'password123', path: '/student/dashboard' },
        academician: { email: 'faculty@ssn.edu.in', password: 'password123', path: '/institution/dashboard' },
        industry: { email: 'hr@abctech.demo', password: 'password123', path: '/industry/dashboard' }
    };

    const fillDemo = (role) => {
        setError(false);
        setEmail(mockCredentials[role].email);
        setPassword(mockCredentials[role].password);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        setError(false);
        
        const role = Object.keys(mockCredentials).find(
            key => mockCredentials[key].email === email && mockCredentials[key].password === password
        );

        if (role) {
            setLoading(true);
            // Simulate network delay
            setTimeout(() => {
                navigate(mockCredentials[role].path);
            }, 600);
        } else {
            setError(true);
        }
    };

    return (
        <div className="login-container">
            {/* Left Side: Branding/Visual */}
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

            {/* Right Side: Form */}
            <div className="login-form-wrapper">
                <div className="form-container">
                    <div className="mobile-brand">
                        <i className="ph-fill ph-buildings"></i>
                        <span>BridgeX</span>
                    </div>
                    
                    <div className="form-header">
                        <h1>Welcome back</h1>
                        <p>Please enter your details to sign in.</p>
                    </div>

                    {/* Hackathon Demo Helper */}
                    <div className="demo-helper">
                        <p className="demo-title"><i className="ph-fill ph-info"></i> Hackathon Demo Accounts</p>
                        <p className="demo-subtitle">Click a role to auto-fill the login details:</p>
                        <div className="demo-buttons">
                            <button type="button" className="demo-btn" onClick={() => fillDemo('student')}>Student</button>
                            <button type="button" className="demo-btn" onClick={() => fillDemo('academician')}>Academician</button>
                            <button type="button" className="demo-btn" onClick={() => fillDemo('industry')}>Industry</button>
                        </div>
                    </div>

                    <form onSubmit={handleLogin}>
                        <div className="input-group">
                            <label>Email address</label>
                            <div className="input-wrapper">
                                <i className="ph ph-envelope-simple"></i>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com" 
                                    required 
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Password</label>
                            <div className="input-wrapper">
                                <i className="ph ph-lock-key"></i>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••" 
                                    required 
                                />
                            </div>
                        </div>

                        <div className="form-options">
                            <label className="remember-me">
                                <input type="checkbox" />
                                <span>Remember me</span>
                            </label>
                            <a href="#" className="forgot-password">Forgot password?</a>
                        </div>

                        {error && (
                            <div className="error-message">
                                <i className="ph-fill ph-warning-circle"></i>
                                <span>Invalid credentials. Try a demo account above.</span>
                            </div>
                        )}

                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
