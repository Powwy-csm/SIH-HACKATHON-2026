import React from 'react';
import { useNavigate } from 'react-router-dom';

// Shared shell for the four "coming soon" style views.
function ComingSoonView({ heading, subtitle, icon, cardTitle, cardBody, onNavigate }) {
    const navigate = useNavigate();
    const handleReturn = () => {
        if (onNavigate) {
            onNavigate('dashboard');
        } else {
            navigate('/institution/dashboard');
        }
    };

    return (
        <main className="view-section active">
            <div className="dashboard-header">
                <div>
                    <h2>{heading}</h2>
                    <p className="subtitle">{subtitle}</p>
                </div>
            </div>
            <div className="card p-24 text-center">
                <i className={`ph ${icon} text-blue`} style={{ fontSize: '48px' }}></i>
                <h3 className="mt-16">{cardTitle}</h3>
                <p className="text-muted mt-8">{cardBody}</p>
                <button className="btn btn-primary mt-16" onClick={handleReturn}>
                    <i className="ph ph-arrow-left"></i> Return to Dashboard View
                </button>
            </div>
        </main>
    );
}

export function StudentOpportunities({ onNavigate }) {
    return (
        <ComingSoonView
            onNavigate={onNavigate}
            heading="Student Opportunities & Internships"
            subtitle="Broadcast partner job openings, internships, and live challenges to matching candidate pools."
            icon="ph-briefcase"
            cardTitle="Active Corporate Opportunities Pipeline"
            cardBody="34 active opportunities posted by verified industry partners. Students are auto-matched based on digital portfolios."
        />
    );
}

export function FacultyOpportunities({ onNavigate }) {
    return (
        <ComingSoonView
            onNavigate={onNavigate}
            heading="Faculty Opportunities & Industry Engagement"
            subtitle="Faculty internships, Industrial Training, FDPs, Consultancy, and Collaborative Research Grants."
            icon="ph-chalkboard-teacher"
            cardTitle="Academician Career & Research Enrichment"
            cardBody="Explore faculty sabbatical internships at ABC Tech, sponsored AI research grants, and corporate consultancy projects."
        />
    );
}

export function Collaborations({ onNavigate }) {
    return (
        <ComingSoonView
            onNavigate={onNavigate}
            heading="Academia-Industry Collaborations & MoUs"
            subtitle="Track active corporate MoUs, co-developed Centers of Excellence, and live hackathon challenges."
            icon="ph-handshake"
            cardTitle="18 Active Industry Partnerships"
            cardBody="Manage joint labs, corporate mentorship tracks, and guest speaker sessions across departments."
        />
    );
}

export function Placements({ onNavigate }) {
    return (
        <ComingSoonView
            onNavigate={onNavigate}
            heading="Placement & Internship Progress Analytics"
            subtitle="Comprehensive conversion metrics, hiring trends, and corporate placement records."
            icon="ph-chart-line-up"
            cardTitle="Batch 2026-27 Placement Performance"
            cardBody="52 placed offers secured, 148 candidates shortlisted, 312 students undergoing corporate internships."
        />
    );
}
