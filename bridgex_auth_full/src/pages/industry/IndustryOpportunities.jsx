import React, { useState } from 'react';
import PostOpportunityModal from '../../components/modals/PostOpportunityModal';

const OPPORTUNITIES = [
    {
        id: 1,
        title: 'AI Engineer Intern',
        type: 'Internship',
        badge: 'badge-gray',
        department: 'AI Research Labs',
        applications: 48,
        shortlisted: 14,
        deadline: 'Sep 15, 2026',
        status: 'Active',
        statusBadge: 'badge-success',
        stipend: '₹25,000/mo',
        location: 'Bengaluru / Hybrid',
    },
    {
        id: 2,
        title: 'Data Analyst Intern',
        type: 'Internship',
        badge: 'badge-gray',
        department: 'Business Intelligence',
        applications: 32,
        shortlisted: 9,
        deadline: 'Sep 20, 2026',
        status: 'Active',
        statusBadge: 'badge-success',
        stipend: '₹18,000/mo',
        location: 'Remote',
    },
    {
        id: 3,
        title: 'Frontend Developer',
        type: 'Entry-level',
        badge: 'badge-blue',
        department: 'Cloud Platform Core',
        applications: 61,
        shortlisted: 18,
        deadline: 'Sep 25, 2026',
        status: 'Active',
        statusBadge: 'badge-success',
        stipend: '₹12 LPA',
        location: 'Bengaluru',
    },
    {
        id: 4,
        title: 'Cloud DevOps Apprenticeship',
        type: 'Apprenticeship',
        badge: 'badge-blue',
        department: 'SRE & Infrastructure',
        applications: 27,
        shortlisted: 6,
        deadline: 'Oct 05, 2026',
        status: 'Active',
        statusBadge: 'badge-success',
        stipend: '₹22,000/mo',
        location: 'Chennai / On-site',
    },
];

export default function IndustryOpportunities() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filter, setFilter] = useState('All');

    const filtered = OPPORTUNITIES.filter(item => {
        if (filter === 'All') return true;
        return item.type.toLowerCase().includes(filter.toLowerCase());
    });

    return (
        <main className="dashboard-area">
            <div className="dashboard-header">
                <div>
                    <h2>Manage Campus Opportunities</h2>
                    <p className="subtitle">Publish, track applicant pipelines, and manage deadlines across hiring programs.</p>
                </div>
                <button className="btn btn-primary" type="button" onClick={() => setIsModalOpen(true)}>
                    <i className="ph ph-plus"></i> Post Opportunity
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="dashboard-tabs">
                {['All', 'Internship', 'Entry-level', 'Apprenticeship'].map(t => (
                    <button
                        key={t}
                        type="button"
                        className={`dashboard-tab ${filter === t ? 'active' : ''}`}
                        onClick={() => setFilter(t)}
                    >
                        {t === 'All' ? 'All Roles' : t}
                    </button>
                ))}
            </div>

            <section className="card">
                <div className="card-header">
                    <h3>Published Opportunities ({filtered.length})</h3>
                </div>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Role / Title</th>
                                <th>Type</th>
                                <th>Department</th>
                                <th>Compensation</th>
                                <th>Applications</th>
                                <th>Shortlisted</th>
                                <th>Deadline</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(opp => (
                                <tr key={opp.id}>
                                    <td className="font-medium">{opp.title}</td>
                                    <td><span className={`badge ${opp.badge}`}>{opp.type}</span></td>
                                    <td>{opp.department}</td>
                                    <td>{opp.stipend}</td>
                                    <td style={{ fontWeight: 600 }}>{opp.applications}</td>
                                    <td><span className="badge badge-blue">{opp.shortlisted} candidates</span></td>
                                    <td>{opp.deadline}</td>
                                    <td><span className={`badge ${opp.statusBadge}`}>{opp.status}</span></td>
                                    <td>
                                        <button
                                            className="btn-link"
                                            type="button"
                                            onClick={() => alert(`Opening candidate pipeline for ${opp.title}...`)}
                                        >
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {isModalOpen && (
                <PostOpportunityModal onClose={() => setIsModalOpen(false)} />
            )}
        </main>
    );
}
