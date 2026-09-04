import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockData } from '../data/mockData';
import '../styles/institution.css';

export default function InstitutionLayout() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navClass = ({ isActive }) => (isActive ? 'nav-item active' : 'nav-item');
    const closeSidebar = () => setSidebarOpen(false);

    const deanName = mockData.institution?.deanName || user?.full_name || 'Dr. Priya Menon';
    const deanRole = mockData.institution?.deanRole || 'Dean • Industry Linkage';
    const avatarUrl = user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(deanName)}&background=EFF6FF&color=1D4ED8&bold=true`;

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
                        <div className="institution-dropdown" onClick={() => navigate('/institution/profile')} style={{ cursor: 'pointer' }}>
                            <div className="avatar bg-blue-light text-blue">{mockData.institution?.shortName || 'SSN'}</div>
                            <span className="profile-name">{mockData.institution?.name || 'SSN College of Engineering'}</span>
                            <i className="ph ph-caret-down text-muted"></i>
                        </div>
                    </div>
                </header>

                <Outlet />
            </div>
        </div>
    );
}