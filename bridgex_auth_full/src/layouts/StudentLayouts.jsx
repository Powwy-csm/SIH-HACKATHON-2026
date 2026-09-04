import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockData } from '../data/mockData';

// src/layouts/StudentLayout.jsx
import '../styles/student.css'; 

export default function StudentLayout() {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const student = mockData.students[0];
    const studentName = student?.full_name || user?.full_name || 'Student';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=E2E8F0&color=172033&bold=true`;
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
                        <img src={avatarUrl} alt={studentName} className="avatar" />
                        <div className="info">
                            <span className="name">{studentName}</span>
                            <span className="degree">B.E. Computer Science</span>
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
                        <div className="top-profile">
                            <img src={avatarUrl} alt="Avatar" />
                        </div>
                    </div>
                </header>

                {/* This is where the page content gets injected */}
                <Outlet />
            </main>
        </div>
    );
}
