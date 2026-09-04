import React from 'react';

const COLLABS = [
    {
        id: 1,
        college: 'SSN College of Engineering',
        logo: 'SSN',
        badge: 'Active MoU (2024–2027)',
        type: 'Centre of Excellence Lab',
        description: 'Joint GenAI & Data Intelligence CoE Lab • 120 students enrolled in workshop • 14 campus internship offers.',
        lead: 'Dr. R. Ramanathan, HOD CSE',
    },
    {
        id: 2,
        college: 'Madras Institute of Technology',
        logo: 'MIT',
        logoBg: '#E0F2FE',
        logoColor: '#0284C7',
        badge: 'Active MoU (2023–2026)',
        type: 'Capstone Challenge Title Sponsor',
        description: 'Annual Capstone Hackathon Title Sponsor • 8 live industry projects sponsored • 12 shortlisted candidates.',
        lead: 'Prof. S. Meenakshi, Dean MIT',
    },
    {
        id: 3,
        college: 'PSG College of Technology',
        logo: 'PSG',
        logoBg: '#F3E8FF',
        logoColor: '#7C3AED',
        badge: 'Active MoU (2025–2028)',
        type: 'Faculty Sabbatical & Research Grant',
        description: 'Faculty Sabbatical Program • Applied ML Research Grant ₹8.5 Lakhs co-funded with AI department.',
        lead: 'Dr. K. Venkatesh, Research Director',
    },
];

export default function IndustryCollaborations() {
    return (
        <main className="dashboard-area">
            <div className="dashboard-header">
                <div>
                    <h2>Academia Collaborations &amp; Institutional MoUs</h2>
                    <p className="subtitle">Manage joint academic research, CoE labs, hackathons, and long-term campus partnerships.</p>
                </div>
                <button className="btn btn-primary" type="button" onClick={() => alert('Initiating new University Collaboration MoU proposal...')}>
                    <i className="ph ph-plus"></i> Partner with New University
                </button>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-handshake"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">8</span>
                        <span className="stat-label">Active University MoUs</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-flask"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">3</span>
                        <span className="stat-label">Joint CoE Labs</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-git-branch"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">16</span>
                        <span className="stat-label">Live Student Projects</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-currency-inr"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">₹24.5L</span>
                        <span className="stat-label">R&amp;D Grants Allocated</span>
                    </div>
                </div>
            </div>

            <section className="card p-28">
                <div className="card-header border-none p-0 mb-16" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 className="section-title" style={{ marginBottom: '4px' }}>
                            <i className="ph ph-buildings text-accent"></i> Active Campus Partnerships
                        </h3>
                        <p className="subtitle">Institutions with formal MoUs and active co-development programs.</p>
                    </div>
                </div>

                <div className="mou-partner-list">
                    {COLLABS.map(c => (
                        <div className="mou-card-item" key={c.id}>
                            <div className="mou-logo-box" style={{ background: c.logoBg, color: c.logoColor }}>
                                {c.logo}
                            </div>
                            <div className="mou-card-content">
                                <div className="mou-card-top">
                                    <h5>{c.college}</h5>
                                    <span className="badge badge-success">{c.badge}</span>
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '4px' }}>
                                    {c.type} • Contact: {c.lead}
                                </div>
                                <p className="text-muted" style={{ fontSize: '13px' }}>
                                    {c.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
