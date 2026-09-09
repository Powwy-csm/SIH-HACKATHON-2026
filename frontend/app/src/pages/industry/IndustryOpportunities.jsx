import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/apiClient';
import PostOpportunityModal from '../../components/modals/PostOpportunityModal';

const TYPE_BADGE = {
    internship:    'badge-gray',
    placement:     'badge-blue',
    apprenticeship:'badge-blue',
    training:      'badge-success',
    bootcamp:      'badge-success',
};

const TYPE_LABEL = {
    internship:    'Internship',
    placement:     'Placement / Job',
    apprenticeship:'Apprenticeship',
    training:      'Training',
    bootcamp:      'Bootcamp',
};

const ALL_TYPES = ['All', 'internship', 'placement', 'training', 'bootcamp', 'apprenticeship'];

export default function IndustryOpportunities() {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filter, setFilter] = useState('All');
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchCompanyAndOpportunities = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const data = await apiFetch('/api/industry/opportunities');
            const mapped = (data || []).map(p => ({
                ...p,
                applicationCount: p.applicant_count || 0
            }));
            setOpportunities(mapped);
        } catch (err) {
            console.error('fetchOpportunities error:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchCompanyAndOpportunities();
    }, [fetchCompanyAndOpportunities]);

    const handlePublish = (newPosting) => {
        if (newPosting) {
            setOpportunities(prev => [{ ...newPosting, applicationCount: 0 }, ...prev.filter(p => p.id !== newPosting.id)]);
        }
    };

    const filtered = filter === 'All'
        ? opportunities
        : opportunities.filter(o => o.type === filter);

    const formatDeadline = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

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
                {ALL_TYPES.map(t => (
                    <button
                        key={t}
                        type="button"
                        className={`dashboard-tab ${filter === t ? 'active' : ''}`}
                        onClick={() => setFilter(t)}
                    >
                        {t === 'All' ? 'All Roles' : TYPE_LABEL[t] || t}
                    </button>
                ))}
            </div>

            <section className="card">
                <div className="card-header">
                    <h3>Published Opportunities ({filtered.length})</h3>
                    {loading && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</span>}
                </div>

                {!loading && filtered.length === 0 ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <i className="ph ph-folder-open" style={{ fontSize: 36, display: 'block', marginBottom: 12 }}></i>
                        <p style={{ margin: 0 }}>No opportunities posted yet. Click <strong>Post Opportunity</strong> to get started.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Role / Title</th>
                                    <th>Type</th>
                                    <th>Compensation</th>
                                    <th>Location</th>
                                    <th>Applications</th>
                                    <th>Deadline</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(opp => (
                                    <tr key={opp.id}>
                                        <td className="font-medium">{opp.title}</td>
                                        <td><span className={`badge ${TYPE_BADGE[opp.type] || 'badge-gray'}`}>{TYPE_LABEL[opp.type] || opp.type}</span></td>
                                        <td>{opp.stipend_text || '—'}</td>
                                        <td>{opp.location || '—'}</td>
                                        <td style={{ fontWeight: 600 }}>{opp.applicationCount}</td>
                                        <td>{formatDeadline(opp.application_deadline)}</td>
                                        <td>
                                            <span className={`badge ${opp.status === 'open' ? 'badge-success' : 'badge-gray'}`}>
                                                {opp.status === 'open' ? 'Active' : 'Draft'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-link"
                                                type="button"
                                                onClick={() => window.location.href = '/industry/applications'}
                                            >
                                                View Applicants
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {isModalOpen && (
                <PostOpportunityModal
                    onClose={() => setIsModalOpen(false)}
                    onPublish={handlePublish}
                />
            )}
        </main>
    );
}
