import React, { useState } from 'react';
import { mockData } from '../../data/mockData';

import InstitutionDashboard from './InstitutionDashboard';
import StudentReadiness from './StudentReadiness';
import IndustryDemand from './IndustryDemand';
import {
    StudentOpportunities,
    FacultyOpportunities,
    Collaborations,
    Placements,
} from './ComingSoonViews';
import InstitutionProfile from './InstitutionProfile';
import PortfolioModal from './PortfolioModal';

// Maps each sidebar nav key to its title (topbar) and component.
// This replaces navigateToView()'s manual DOM show/hide + title swap.
const VIEWS = {
    dashboard: { title: 'Dashboard', Component: InstitutionDashboard },
    students: { title: 'Student Readiness', Component: StudentReadiness },
    demand: { title: 'Industry Demand & Gaps', Component: IndustryDemand },
    opportunities: { title: 'Student Opportunities', Component: StudentOpportunities },
    faculty: { title: 'Faculty Opportunities', Component: FacultyOpportunities },
    collaborations: { title: 'Industry Collaboration', Component: Collaborations },
    placements: { title: 'Placement & Internships', Component: Placements },
    profile: { title: 'Institution Profile', Component: InstitutionProfile },
};

const NAV_SECTIONS = [
    {
        label: 'Main Dashboard',
        items: [
            { key: 'dashboard', icon: 'ph-squares-four', label: 'Dashboard' },
            { key: 'students', icon: 'ph-users-three', label: 'Student Readiness' },
            { key: 'demand', icon: 'ph-chart-polar', label: 'Industry Demand & Gaps' },
        ],
    },
    {
        label: 'Opportunities & Linkages',
        items: [
            { key: 'opportunities', icon: 'ph-briefcase', label: 'Student Opportunities' },
            { key: 'faculty', icon: 'ph-chalkboard-teacher', label: 'Faculty Opportunities' },
            { key: 'collaborations', icon: 'ph-handshake', label: 'Industry Collaboration' },
            { key: 'placements', icon: 'ph-chart-line-up', label: 'Placement & Internships' },
        ],
    },
    {
        label: 'Academic Dossier',
        items: [
            { key: 'profile', icon: 'ph-bank', label: 'Institution Profile' },
        ],
        divider: true,
    },
];

export default function InstitutionApp() {
    const [activeView, setActiveView] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [portfolioStudentId, setPortfolioStudentId] = useState(null);

    const { title, Component } = VIEWS[activeView];

    function navigateTo(key) {
        setActiveView(key);
        setSidebarOpen(false); // mirrors the mobile-close-on-navigate behavior
    }

    function openPortfolio(studentId) {
        setPortfolioStudentId(studentId);
    }

    function closePortfolio() {
        setPortfolioStudentId(null);
    }

    return (
        <div className="app-container">

            {/* ===================== SIDEBAR ===================== */}
            <aside className={`sidebar ${sidebarOpen ? 'show' : ''}`} id="sidebar">

                <div className="sidebar-header">
                    <div className="logo">
                        <i className="ph-fill ph-buildings"></i>
                        <span>BridgeX</span>
                    </div>
                    <span className="role-badge">Institution &amp; Academician</span>
                    <button className="mobile-close" onClick={() => setSidebarOpen(false)}>
                        <i className="ph ph-x"></i>
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {NAV_SECTIONS.map(section => (
                        <React.Fragment key={section.label}>
                            {section.divider && <div className="nav-divider"></div>}
                            <span className={`nav-label ${section.label === 'Opportunities & Linkages' ? 'mt-20' : ''}`}>
                                {section.label}
                            </span>
                            {section.items.map(item => (
                                <a
                                    key={item.key}
                                    href="#"
                                    className={`nav-item ${activeView === item.key ? 'active' : ''}`}
                                    onClick={(e) => { e.preventDefault(); navigateTo(item.key); }}
                                >
                                    <i className={`ph ${item.icon}`}></i> {item.label}
                                </a>
                            ))}
                        </React.Fragment>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile-dropdown" onClick={() => navigateTo('profile')}>
                        <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(mockData.institution.deanName)}&background=EFF6FF&color=1D4ED8&bold=true`}
                            alt={mockData.institution.deanName}
                            className="avatar"
                        />
                        <div className="info">
                            <span className="name">{mockData.institution.deanName}</span>
                            <span className="role">{mockData.institution.deanRole}</span>
                        </div>
                        <i className="ph ph-caret-right text-muted"></i>
                    </div>
                </div>
            </aside>

            {/* ===================== MAIN CONTENT ===================== */}
            <div className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <button className="mobile-toggle" onClick={() => setSidebarOpen(true)}>
                            <i className="ph ph-list"></i>
                        </button>
                        <h1 className="page-title">{title}</h1>
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
                        <div className="institution-dropdown" onClick={() => navigateTo('profile')}>
                            <div className="avatar bg-blue-light text-blue">{mockData.institution.shortName}</div>
                            <span className="profile-name">{mockData.institution.name}</span>
                            <i className="ph ph-caret-down text-muted"></i>
                        </div>
                    </div>
                </header>

                <Component onNavigate={navigateTo} onOpenPortfolio={openPortfolio} />
            </div>

            {portfolioStudentId !== null && (
                <PortfolioModal studentId={portfolioStudentId} onClose={closePortfolio} />
            )}
        </div>
    );
}
