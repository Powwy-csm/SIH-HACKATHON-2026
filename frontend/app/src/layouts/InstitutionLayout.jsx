import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockData } from '../data/mockData';
import '../styles/institution.css';

export default function InstitutionLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const navClass = ({ isActive }) => (isActive ? 'nav-item active' : 'nav-item');
    const closeSidebar = () => setSidebarOpen(false);

    const deanName = mockData.institution?.deanName || user?.full_name || 'Dr. Priya Menon';
    const deanRole = mockData.institution?.deanRole || 'Dean • Industry Linkage';
    const avatarUrl = user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(deanName)}&background=EFF6FF&color=1D4ED8&bold=true`;
    const institutionName = mockData.institution?.name || 'SSN College of Engineering';
    const institutionShort = mockData.institution?.shortName || 'SSN';

    const getInitials = (name) => {
        if (!name) return 'IN';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="app-container institution-portal">
            <aside className={`sidebar ${sidebarOpen ? 'show' : ''}`} id="sidebar">
                <div className="sidebar-header">
                    <div className="logo">
                        <i className="ph-fill ph-buildings"></i>
                        <span>BridgeX</span>
                    </div>
                    <span className="role-badge">Institution &amp; Academician</span>
                    <button className="mobile-close" onClick={closeSidebar}>
                        <i className="ph ph-x"></i>
                    </button>
                </div>
                
                <nav className="sidebar-nav">
                    <span className="nav-label">Main Dashboard</span>
                    <NavLink to="/institution/dashboard" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-squares-four"></i> Dashboard
                    </NavLink>
                    <NavLink to="/institution/students" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-users-three"></i> Student Readiness
                    </NavLink>
                    <NavLink to="/institution/demand" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-chart-polar"></i> Industry Demand &amp; Gaps
                    </NavLink>
                    
                    <span className="nav-label mt-20">Opportunities &amp; Linkages</span>
                    <NavLink to="/institution/opportunities" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-briefcase"></i> Student Opportunities
                    </NavLink>
                    <NavLink to="/institution/faculty" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-chalkboard-teacher"></i> Faculty Opportunities
                    </NavLink>
                    <NavLink to="/institution/collaborations" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-handshake"></i> Industry Collaboration
                    </NavLink>
                    <NavLink to="/institution/placements" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-chart-line-up"></i> Placement &amp; Internships
                    </NavLink>
                    
                    <div className="nav-divider"></div>
                    
                    <span className="nav-label">Academic Dossier</span>
                    <NavLink to="/institution/profile" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-bank"></i> Institution Profile
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile-dropdown" onClick={() => navigate('/institution/profile')} style={{ cursor: 'pointer' }}>
                        <img src={avatarUrl} alt={deanName} className="avatar" />
                        <div className="info">
                            <span className="name">{deanName}</span>
                            <span className="role">{deanRole}</span>
                        </div>
                        <i className="ph ph-caret-right text-muted" style={{ marginLeft: 'auto' }}></i>
                    </div>
                </div>
            </aside>

            <div className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <button className="mobile-toggle" onClick={() => setSidebarOpen(true)}>
                            <i className="ph ph-list"></i>
                        </button>
                        <h1 className="page-title">Workspace</h1>
                    </div>
                    <div className="topbar-right">
                        <div className="search-bar">
                            <i className="ph ph-magnifying-glass"></i>
                            <input type="text" placeholder="Search students, skills, gaps, or MoUs..." />
                        </div>
                        <button className="icon-btn notification-btn" title="Notifications">
                            <i className="ph ph-bell"></i>
                            <span className="badge">4</span>
                        </button>
                        <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                onClick={() => setDropdownOpen(prev => !prev)}
                                className="institution-dropdown"
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                                aria-label="User menu"
                            >
                                <div className="avatar bg-blue-light text-blue">{institutionShort}</div>
                                <span className="profile-name">{institutionName}</span>
                                <i className="ph ph-caret-down text-muted"></i>
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
                                        width: 250,
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: '12px',
                                        border: '1px solid #E2E8F0',
                                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                                        padding: '12px 0',
                                        fontSize: 14,
                                        color: '#0F172A',
                                    }}>
                                        <div style={{ padding: '0 16px 10px 16px', borderBottom: '1px solid #F1F5F9' }}>
                                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{deanName}</div>
                                            <div style={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {user?.email}
                                            </div>
                                            <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 4, background: '#EFF6FF', color: '#1D4ED8', fontSize: 11, fontWeight: 600 }}>
                                                INSTITUTION
                                            </span>
                                        </div>

                                        <div style={{ padding: '6px 0' }}>
                                            <Link
                                                to="/institution/profile"
                                                onClick={() => setDropdownOpen(false)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', color: '#334155', textDecoration: 'none', transition: 'background 0.15s ease' }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <i className="ph ph-bank" style={{ fontSize: 16 }}></i>
                                                Institution Profile
                                            </Link>
                                            <Link
                                                to="/institution/settings"
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

                <Outlet />
            </div>
        </div>
    );
}