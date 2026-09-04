import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

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
                        <div className="avatar">ABC</div>
                        <div className="info">
                            <span className="name">ABC Tech</span>
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
                        <div className="profile-dropdown" onClick={() => navigate('/industry/profile')}>
                            <div className="avatar">
                                <img src="https://ui-avatars.com/api/?name=ABC+Tech&background=0B1F3A&color=fff" alt="Company Logo" />
                            </div>
                            <span className="profile-name">ABC Technologies</span>
                            <i className="ph ph-caret-down"></i>
                        </div>
                    </div>
                </header>

                {/* Injected View Page */}
                <Outlet />
            </div>

        </div>
    );
}