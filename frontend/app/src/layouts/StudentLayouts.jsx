import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// src/layouts/StudentLayout.jsx
import '../styles/student.css'; 

export default function StudentLayout() {
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const studentName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'Student');
    const studentSubtitle = user?.email || (user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Student Portal');
    
    const getInitials = (name) => {
        if (!name) return 'ST';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };
    const userInitials = getInitials(studentName);

    const avatarUrl = user?.avatar_url;
    const navClass = ({ isActive }) => isActive ? 'nav-item active' : 'nav-item';
    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className="app-wrapper student-portal">
            
            <aside className={`sidebar ${sidebarOpen ? 'show' : ''}`} id="sidebar">
                <div className="sidebar-header">
                    <div className="logo">
                        <i className="ph-fill ph-buildings"></i>
                        <span>BridgeX</span>
                    </div>
                    <span className="role-label">Student Portal</span>
                    <button className="mobile-close" onClick={() => setSidebarOpen(false)}>
                        <i className="ph ph-x"></i>
                    </button>
                </div>
                
                <nav className="sidebar-nav">
                    <NavLink to="/student/dashboard" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-squares-four"></i> Dashboard
                    </NavLink>
                    <NavLink to="/student/profile" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-user"></i> My Profile
                    </NavLink>
                    <NavLink to="/student/resume" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-file-text"></i> Resume Intelligence
                    </NavLink>
                    <NavLink to="/student/opportunities" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-briefcase"></i> Opportunities
                    </NavLink>
                    <NavLink to="/student/assessment" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-target"></i> Skill Assessment
                    </NavLink>
                    <NavLink to="/student/applications" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-paper-plane-tilt"></i> Applications
                    </NavLink>
                    <NavLink to="/student/portfolio" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-folder-star"></i> My Portfolio
                    </NavLink>
                    <NavLink to="/student/learning" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-book-open"></i> Learning
                    </NavLink>
                    <NavLink to="/student/events" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-calendar-blank"></i> Events
                    </NavLink>
                    
                    <div className="nav-divider"></div>
                    
                    <NavLink to="/student/roadmap" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-map-trifold"></i> Career Roadmap
                    </NavLink>
                    <NavLink to="/student/settings" className={navClass} onClick={closeSidebar}>
                        <i className="ph ph-gear"></i> Settings
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <div className="student-profile-mini">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={studentName} className="avatar" />
                        ) : (
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#3B82F6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 13, flexShrink: 0 }}>
                                {userInitials}
                            </div>
                        )}
                        <div className="info">
                            <span className="name">{studentName}</span>
                            <span className="degree" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                                {studentSubtitle}
                            </span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <button className="mobile-toggle" onClick={() => setSidebarOpen(true)}>
                            <i className="ph ph-list"></i>
                        </button>
                    </div>
                    <div className="topbar-right">
                        <div className="search-wrap">
                            <i className="ph ph-magnifying-glass"></i>
                            <input type="text" placeholder="Search opportunities, skills..." />
                        </div>
                        <button className="icon-btn" type="button" aria-label="Help">
                            <i className="ph ph-question"></i>
                        </button>
                        <button className="icon-btn notification-btn">
                            <i className="ph ph-bell"></i>
                            <span className="indicator"></span>
                        </button>

                        {/* Interactive Profile Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                onClick={() => setDropdownOpen(prev => !prev)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderRadius: '50%',
                                }}
                                aria-label="User menu"
                            >
                                <div className="top-profile" style={{ cursor: 'pointer' }}>
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={studentName} />
                                    ) : (
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 13 }}>
                                            {userInitials}
                                        </div>
                                    )}
                                </div>
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
                                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{studentName}</div>
                                            <div style={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {user?.email}
                                            </div>
                                            <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 600 }}>
                                                {user?.role ? user.role.toUpperCase() : 'STUDENT'}
                                            </span>
                                        </div>

                                        <div style={{ padding: '6px 0' }}>
                                            <Link
                                                to="/student/profile"
                                                onClick={() => setDropdownOpen(false)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    padding: '8px 16px',
                                                    color: '#334155',
                                                    textDecoration: 'none',
                                                    transition: 'background 0.15s ease',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <i className="ph ph-user" style={{ fontSize: 16 }}></i>
                                                My Profile
                                            </Link>
                                            <Link
                                                to="/student/settings"
                                                onClick={() => setDropdownOpen(false)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    padding: '8px 16px',
                                                    color: '#334155',
                                                    textDecoration: 'none',
                                                    transition: 'background 0.15s ease',
                                                }}
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
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    width: '100%',
                                                    padding: '8px 16px',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: '#DC2626',
                                                    fontSize: 14,
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
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

                {/* This is where the page content gets injected */}
                <Outlet />
            </main>
        </div>
    );
}
