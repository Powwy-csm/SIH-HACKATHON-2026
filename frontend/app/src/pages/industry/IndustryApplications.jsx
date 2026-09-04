import React, { useState } from 'react';

const APPLICATIONS = [
    {
        id: 1,
        studentName: 'Aarav Sharma',
        role: 'AI Engineer Intern',
        college: 'SSN College of Engineering',
        skills: ['Python', 'Machine Learning', 'SQL'],
        stage: 'Shortlisted',
        stageBadge: 'badge-blue',
        appliedDate: 'Aug 28, 2026',
        match: '92%',
    },
    {
        id: 2,
        studentName: 'Priya Nair',
        role: 'Frontend Developer',
        college: 'Madras Institute of Technology',
        skills: ['React', 'Node.js', 'AWS'],
        stage: 'Interview Scheduled',
        stageBadge: 'badge-gray',
        appliedDate: 'Aug 29, 2026',
        match: '88%',
    },
    {
        id: 3,
        studentName: 'Rahul Verma',
        role: 'Data Analyst Intern',
        college: 'PSG College of Technology',
        skills: ['Python', 'SQL', 'PowerBI'],
        stage: 'Reviewing',
        stageBadge: 'badge-gray',
        appliedDate: 'Aug 30, 2026',
        match: '84%',
    },
    {
        id: 4,
        studentName: 'Karthik Raja',
        role: 'Frontend Developer',
        college: 'College of Engineering Guindy',
        skills: ['Full-Stack', 'Go', 'Docker'],
        stage: 'Selected / Offer Sent',
        stageBadge: 'badge-success',
        appliedDate: 'Aug 25, 2026',
        match: '94%',
    },
];

export default function IndustryApplications() {
    const [statusFilter, setStatusFilter] = useState('All');

    const filtered = APPLICATIONS.filter(app => {
        if (statusFilter === 'All') return true;
        return app.stage.toLowerCase().includes(statusFilter.toLowerCase());
    });

    return (
        <main className="dashboard-area">
            <div className="dashboard-header">
                <div>
                    <h2>Applications &amp; Candidate Pipeline</h2>
                    <p className="subtitle">Track students moving through review, technical assessment, interviews, and final offers.</p>
                </div>
                <button className="btn btn-outline" type="button" onClick={() => alert('Exporting application reports (CSV)...')}>
                    <i className="ph ph-download-simple"></i> Export ATS Data
                </button>
            </div>

            {/* Quick Status Bar */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-files"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">248</span>
                        <span className="stat-label">Total Applied</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-user-check"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">31</span>
                        <span className="stat-label">Shortlisted</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-chats-circle"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">18</span>
                        <span className="stat-label">In Technical Interview</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-seal-check"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">12</span>
                        <span className="stat-label">Offers Extended</span>
                    </div>
                </div>
            </div>

            <section className="card">
                <div className="card-header">
                    <h3>Recent Applicants ({filtered.length})</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['All', 'Shortlisted', 'Interview', 'Selected'].map(st => (
                            <button
                                key={st}
                                type="button"
                                className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => setStatusFilter(st)}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Candidate</th>
                                <th>Target Opportunity</th>
                                <th>Institution</th>
                                <th>Match Score</th>
                                <th>Application Date</th>
                                <th>Pipeline Stage</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(app => (
                                <tr key={app.id}>
                                    <td className="font-medium">{app.studentName}</td>
                                    <td>{app.role}</td>
                                    <td className="text-muted">{app.college}</td>
                                    <td><strong style={{ color: 'var(--accent-blue)' }}>{app.match}</strong></td>
                                    <td>{app.appliedDate}</td>
                                    <td><span className={`badge ${app.stageBadge}`}>{app.stage}</span></td>
                                    <td>
                                        <button
                                            className="btn-link"
                                            type="button"
                                            onClick={() => alert(`Opening application profile for ${app.studentName}...`)}
                                        >
                                            Evaluate
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}
