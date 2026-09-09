import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/login.css';

export default function RoleSelection() {
    const navigate = useNavigate();

    const portals = [
        {
            key: 'student',
            title: 'Student Portal',
            subtitle: 'AI skill mapping, portfolio verification, and career opportunities.',
            icon: 'ph-student',
            path: '/login/student',
            badge: 'Student Sign In'
        },
        {
            key: 'institution',
            title: 'Institution Portal',
            subtitle: 'Campus readiness analytics, curriculum planning, and student tracking.',
            icon: 'ph-buildings',
            path: '/login/institution',
            badge: 'Faculty / Academician'
        },
        {
            key: 'industry',
            title: 'Industry Portal',
            subtitle: 'Talent discovery, skill demand analysis, and placement partnerships.',
            icon: 'ph-briefcase',
            path: '/login/industry',
            badge: 'Employer / HR'
        }
    ];

    return (
        <div className="login-container">
            {/* Left Side: Branding / Visual */}
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

            {/* Right Side: Portal Selection Options */}
            <div className="login-form-wrapper">
                <div className="form-container">
                    <div className="mobile-brand">
                        <i className="ph-fill ph-buildings"></i>
                        <span>BridgeX</span>
                    </div>

                    <div className="form-header">
                        <h1>Select Your Portal</h1>
                        <p>Choose your workspace to proceed to sign in.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                        {portals.map((portal) => (
                            <button
                                key={portal.key}
                                type="button"
                                onClick={() => {
                                    localStorage.setItem('bridgex_role_override', portal.key);
                                    navigate(portal.path);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justify: 'space-between',
                                    padding: '16px 20px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#2563EB';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#E2E8F0';
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                                        {portal.title}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748B' }}>
                                        {portal.subtitle}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#2563EB',
                                    backgroundColor: '#EFF6FF',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    whiteSpace: 'nowrap',
                                    marginLeft: '12px'
                                }}>
                                    {portal.badge} &rarr;
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
