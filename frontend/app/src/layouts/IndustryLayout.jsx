import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/industry.css';

const TITLES = {
    '/industry/dashboard': 'Dashboard',
    '/industry/profile': 'Company Profile',
    '/industry/talent': 'Talent / Students',
    '/industry/opportunities': 'Opportunities',
    '/industry/applications': 'Applications',
    '/industry/demand': 'Skill Demand',
    '/industry/events': 'Learning & Events',
    '/industry/collaborations': 'Collaborations',
    '/industry/analytics': 'Analytics',
    '/industry/settings': 'Settings',
};

export default function IndustryLayout() {
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const companyName = user?.full_name || 'ABC Technologies';
    const getInitials = (name) => {
        if (!name) return 'CO';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };
    const userInitials = getInitials(companyName);
    const avatarUrl = user?.avatar_url;

    const currentTitle = TITLES[location.pathname] || 'Dashboard';
    const navClass = ({ isActive }) => `nav-item ${isActive ? 'active' : ''}`;

    return (
        <div className="app-container industry-portal">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'show' : ''}`} id="sidebar">
                <div className="sidebar-header" style={{ position: 'relative' }}>
                    <div className="logo">
                        <i className="ph ph-buildings"></i>
                        <span>BridgeX</span>
                    </div>
                    <span className="role-badge">Industry Portal</span>
                    <button 
                        className="mobile-close" 
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <i className="ph ph-x"></i>
                    </button>
                </div>
                
                <nav className="sidebar-nav">
                    <span className="nav-label">MAIN</span>
                    <NavLink to="/industry/dashboard" className={navClass} end>
                        <i className="ph ph-squares-four"></i> Dashboard
                    </NavLink>
                    <NavLink to="/industry/profile" className={navClass}>
                        <i className="ph ph-buildings"></i> Company Profile
                    </NavLink>
                    <NavLink to="/industry/talent" className={navClass}>
                        <i className="ph ph-users"></i> Talent / Students
                    </NavLink>
                    <NavLink to="/industry/opportunities" className={navClass}>
                        <i className="ph ph-briefcase"></i> Opportunities
                    </NavLink>
                    <NavLink to="/industry/applications" className={navClass}>
                        <i className="ph ph-file-text"></i> Applications
                    </NavLink>
                    
                    <span className="nav-label mt-4">INSIGHTS &amp; COLLAB</span>
                    <NavLink to="/industry/demand" className={navClass}>
                        <i className="ph ph-trend-up"></i> Skill Demand
                    </NavLink>
                    <NavLink to="/industry/events" className={navClass}>
                        <i className="ph ph-calendar-check"></i> Learning &amp; Events
                    </NavLink>
                    <NavLink to="/industry/collaborations" className={navClass}>
                        <i className="ph ph-handshake"></i> Collaborations
                    </NavLink>
                    <NavLink to="/industry/analytics" className={navClass}>
                        <i className="ph ph-chart-line-up"></i> Analytics
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <NavLink to="/industry/settings" className={navClass}>
                        <i className="ph ph-gear"></i> Settings
                    </NavLink>
                    <NavLink to="/industry/help" className={navClass}>
                        <i className="ph ph-question"></i> Help
                    </NavLink>
                    <div 
                        className="company-mini-profile" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/industry/profile')}
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={companyName} className="avatar" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                        ) : (
                            <div className="avatar">{userInitials}</div>
                        )}
                        <div className="info">
                            <span className="name">{companyName}</span>
                            <span className="role">Industry Partner</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <button className="mobile-toggle" type="button" onClick={() => setSidebarOpen(true)}>
                            <i className="ph ph-list"></i>
                        </button>
                        <h1 className="page-title">{currentTitle}</h1>
                    </div>
                    <div className="topbar-right">
                        <div className="search-bar">
                            <i className="ph ph-magnifying-glass"></i>
                            <input type="text" placeholder="Search talent, skills, or opportunities..." />
                        </div>
                        <button className="icon-btn notification-btn" type="button" onClick={() => alert('You have 3 unread campus application updates.')}>
                            <i className="ph ph-bell"></i>
                            <span className="badge">3</span>
                        </button>
                        <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                onClick={() => setDropdownOpen(prev => !prev)}
                                className="profile-dropdown"
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                                aria-label="User menu"
                            >
                                <div className="avatar">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={companyName} />
                                    ) : (
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0B1F3A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 13 }}>
                                            {userInitials}
                                        </div>
                                    )}
                                </div>
                                <span className="profile-name">{companyName}</span>
                                <i className="ph ph-caret-down"></i>
                            </button>

                            {dropdownOpen && (
                                <>
                                    <div
                                        style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                                        onClick={() => setDropdownOpen(false)}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 8px)',
                                        right: 0,
                                        zIndex: 100,
                                        width: 230,
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: '12px',
                                        border: '1px solid #E2E8F0',
                                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                                        padding: '12px 0',
                                        fontSize: 14,
                                        color: '#0F172A',
                                    }}>
                                        <div style={{ padding: '0 16px 10px 16px', borderBottom: '1px solid #F1F5F9' }}>
                                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{companyName}</div>
                                            <div style={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {user?.email}
                                            </div>
                                            <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 600 }}>
                                                INDUSTRY
                                            </span>
                                        </div>

                                        <div style={{ padding: '6px 0' }}>
                                            <Link
                                                to="/industry/profile"
                                                onClick={() => setDropdownOpen(false)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', color: '#334155', textDecoration: 'none', transition: 'background 0.15s ease' }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <i className="ph ph-buildings" style={{ fontSize: 16 }}></i>
                                                Company Profile
                                            </Link>
                                            <Link
                                                to="/industry/settings"
                                                onClick={() => setDropdownOpen(false)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', color: '#334155', textDecoration: 'none', transition: 'background 0.15s ease' }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <i className="ph ph-gear" style={{ fontSize: 16 }}></i>
                                                Settings
                                            </Link>
                                        </div>

                                        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 6 }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDropdownOpen(false);
                                                    logout();
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                                                    padding: '8px 16px', border: 'none', background: 'transparent',
                                                    color: '#DC2626', fontSize: 14, cursor: 'pointer', textAlign: 'left',
                                                    transition: 'background 0.15s ease',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <i className="ph ph-sign-out" style={{ fontSize: 16 }}></i>
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Injected View Page */}
                <Outlet />
            </div>

        </div>
    );
}