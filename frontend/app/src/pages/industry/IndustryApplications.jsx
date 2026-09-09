import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/apiClient';

const STATUS_BADGE = {
    applied:              'badge-gray',
    reviewing:            'badge-gray',
    shortlisted:          'badge-blue',
    interview_scheduled:  'badge-blue',
    selected:             'badge-success',
    rejected:             'badge-gray',
};

const STATUS_LABEL = {
    applied:             'Applied',
    reviewing:           'Reviewing',
    shortlisted:         'Shortlisted',
    interview_scheduled: 'Interview Scheduled',
    selected:            'Selected / Offer Sent',
    rejected:            'Rejected',
};

export default function IndustryApplications() {
    const { user } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [applicantDetails, setApplicantDetails] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const fetchApplications = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const data = await apiFetch('/api/industry/applications');
            const enriched = (data || []).map(a => ({
                ...a,
                postingTitle: a.posting_title || '—',
                postingType:  a.type || '—',
                studentName:  a.student_name || 'Student',
                studentEmail: a.student_email || '',
            }));
            setApplications(enriched);
        } catch (err) {
            console.error('fetchApplications error:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { fetchApplications(); }, [fetchApplications]);

    // Close export menu on click outside
    useEffect(() => {
        if (!showExportMenu) return;
        const close = () => setShowExportMenu(false);
        document.addEventListener('click', close, true);
        return () => document.removeEventListener('click', close, true);
    }, [showExportMenu]);

    const openApplicantProfile = async (app) => {
        setSelectedApplicant(app);
        setLoadingProfile(true);
        setApplicantDetails(null);
        try {
            const data = await apiFetch(`/api/industry/applications/${app.id}/applicant`);
            setApplicantDetails({
                student: {
                    full_name: data.student_name,
                    email: data.student_email,
                },
                skills: (data.skills || []).map(s => ({ skills: { name: s.name }, proficiency_score: s.proficiency })),
                certs: (data.certifications || []).map(c => ({ title: c.title, issued_by: c.issuer, issued_at: c.issue_date })),
            });
        } catch (err) {
            console.error('openApplicantProfile error:', err);
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleStatusChange = async (appId, newStatus) => {
        try {
            await apiFetch(`/api/industry/applications/${appId}/status`, {
                method: 'PATCH',
                body: { status: newStatus },
            });
            setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
        } catch (err) {
            console.error('handleStatusChange error:', err);
        }
    };

    const closeProfile = () => {
        setSelectedApplicant(null);
        setApplicantDetails(null);
    };

    const filtered = statusFilter === 'All'
        ? applications
        : applications.filter(a => a.status === statusFilter);

    const stats = {
        total:       applications.length,
        shortlisted: applications.filter(a => a.status === 'shortlisted').length,
        interview:   applications.filter(a => a.status === 'interview_scheduled').length,
        selected:    applications.filter(a => a.status === 'selected').length,
    };

    const formatDate = (str) => str ? new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    const exportRows = (rows) => rows.map(a => ({
        Candidate:    a.studentName,
        Email:        a.studentEmail,
        Opportunity:  a.postingTitle,
        Type:         a.postingType,
        Stage:        STATUS_LABEL[a.status] || a.status,
        'Applied On': formatDate(a.applied_at),
    }));

    const downloadFile = (content, filename, mime) => {
        const blob = new Blob([content], { type: mime });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    };

    const exportCSV = (rows) => {
        const data   = exportRows(rows);
        if (!data.length) return;
        const headers = Object.keys(data[0]);
        const escape  = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const csv     = [headers.map(escape).join(','), ...data.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
        const label   = statusFilter === 'All' ? 'all' : statusFilter;
        downloadFile(csv, `applicants_${label}_${Date.now()}.csv`, 'text/csv');
    };

    const exportJSON = (rows) => {
        const data  = exportRows(rows);
        const label = statusFilter === 'All' ? 'all' : statusFilter;
        downloadFile(JSON.stringify(data, null, 2), `applicants_${label}_${Date.now()}.json`, 'application/json');
    };

    return (
        <main className="dashboard-area">
            <div className="dashboard-header">
                <div>
                    <h2>Applications &amp; Candidate Pipeline</h2>
                    <p className="subtitle">Track students moving through review, technical assessment, interviews, and final offers.</p>
                </div>
            </div>

            {/* Quick Status Bar */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-files"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">Total Applied</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-user-check"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.shortlisted}</span>
                        <span className="stat-label">Shortlisted</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-chats-circle"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.interview}</span>
                        <span className="stat-label">In Technical Interview</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-seal-check"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.selected}</span>
                        <span className="stat-label">Offers Extended</span>
                    </div>
                </div>
            </div>

            <section className="card">
                <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                    <h3>Applicants ({filtered.length})</h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {['All', 'applied', 'shortlisted', 'interview_scheduled', 'selected'].map(st => (
                            <button
                                key={st}
                                type="button"
                                className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => setStatusFilter(st)}
                            >
                                {st === 'All' ? 'All' : STATUS_LABEL[st] || st}
                            </button>
                        ))}

                        {/* Export dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                className="btn btn-outline"
                                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}
                                onClick={() => setShowExportMenu(v => !v)}
                                disabled={filtered.length === 0}
                            >
                                <i className="ph ph-download-simple" style={{ fontSize: 14 }} />
                                Export
                                <i className="ph ph-caret-down" style={{ fontSize: 12 }} />
                            </button>
                            {showExportMenu && (
                                <div
                                    style={{
                                        position: 'absolute', right: 0, top: '110%', zIndex: 50,
                                        background: 'var(--bg-card, #fff)',
                                        border: '1px solid var(--border-color, #e2e8f0)',
                                        borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                        minWidth: 180, overflow: 'hidden',
                                    }}
                                >
                                    <div style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                                        {statusFilter === 'All' ? 'All Applicants' : `${STATUS_LABEL[statusFilter] || statusFilter} Only`} ({filtered.length})
                                    </div>
                                    {[
                                        { label: 'Download as CSV', icon: 'ph-file-csv', action: () => { exportCSV(filtered); setShowExportMenu(false); } },
                                        { label: 'Download as JSON', icon: 'ph-file-code', action: () => { exportJSON(filtered); setShowExportMenu(false); } },
                                    ].map(item => (
                                        <button
                                            key={item.label}
                                            type="button"
                                            onClick={item.action}
                                            style={{
                                                width: '100%', textAlign: 'left', padding: '10px 16px',
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
                                                color: 'var(--text-primary)',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, #f1f5f9)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                        >
                                            <i className={`ph ${item.icon}`} style={{ fontSize: 15 }} />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading applicants…</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <i className="ph ph-users" style={{ fontSize: 36, display: 'block', marginBottom: 12 }}></i>
                        <p style={{ margin: 0 }}>No applicants yet. Post opportunities so students can apply.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Candidate</th>
                                    <th>Target Opportunity</th>
                                    <th>Type</th>
                                    <th>Application Date</th>
                                    <th>Pipeline Stage</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(app => (
                                    <tr key={app.id}>
                                        <td className="font-medium">
                                            <div>{app.studentName}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.studentEmail}</div>
                                        </td>
                                        <td>{app.postingTitle}</td>
                                        <td><span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{app.postingType}</span></td>
                                        <td>{formatDate(app.applied_at)}</td>
                                        <td><span className={`badge ${STATUS_BADGE[app.status] || 'badge-gray'}`}>{STATUS_LABEL[app.status] || app.status}</span></td>
                                        <td>
                                            <button
                                                className="btn-link"
                                                type="button"
                                                onClick={() => openApplicantProfile(app)}
                                            >
                                                View Profile
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Applicant Profile Modal */}
            {selectedApplicant && (
                <div className="modal-overlay" style={{ display: 'flex' }} onClick={closeProfile}>
                    <div className="modal-container" style={{ maxWidth: 640, width: '95%', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>{selectedApplicant.studentName}</h2>
                                <p className="subtitle" style={{ marginTop: 4, fontSize: 13 }}>
                                    Applied for: <strong>{selectedApplicant.postingTitle}</strong>
                                </p>
                            </div>
                            <button className="icon-btn" onClick={closeProfile} type="button">
                                <i className="ph ph-x"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            {loadingProfile ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading student profile…</div>
                            ) : applicantDetails ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {/* Basic Info */}
                                    <section className="card p-20" style={{ padding: 20 }}>
                                        <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Basic Information</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                                            <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> {selectedApplicant.studentEmail || '—'}</div>
                                            <div><span style={{ color: 'var(--text-muted)' }}>CGPA:</span> {applicantDetails.student?.cgpa || '—'}</div>
                                            <div><span style={{ color: 'var(--text-muted)' }}>Branch:</span> {applicantDetails.student?.branch || '—'}</div>
                                            <div><span style={{ color: 'var(--text-muted)' }}>Year:</span> {applicantDetails.student?.year_of_study || '—'}</div>
                                            <div><span style={{ color: 'var(--text-muted)' }}>LinkedIn:</span> {applicantDetails.student?.linkedin_url ? <a href={applicantDetails.student.linkedin_url} target="_blank" rel="noreferrer">View</a> : '—'}</div>
                                            <div><span style={{ color: 'var(--text-muted)' }}>GitHub:</span> {applicantDetails.student?.github_url ? <a href={applicantDetails.student.github_url} target="_blank" rel="noreferrer">View</a> : '—'}</div>
                                            <div><span style={{ color: 'var(--text-muted)' }}>Portfolio:</span> {applicantDetails.student?.portfolio_url ? <a href={applicantDetails.student.portfolio_url} target="_blank" rel="noreferrer">View</a> : '—'}</div>
                                            <div><span style={{ color: 'var(--text-muted)' }}>Resume:</span> {applicantDetails.student?.resume_url ? <a href={applicantDetails.student.resume_url} target="_blank" rel="noreferrer">Download</a> : '—'}</div>
                                        </div>
                                        {applicantDetails.student?.bio && (
                                            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                                                <strong>Bio:</strong> {applicantDetails.student.bio}
                                            </div>
                                        )}
                                    </section>

                                    {/* Skills */}
                                    {applicantDetails.skills.length > 0 && (
                                        <section className="card" style={{ padding: 20 }}>
                                            <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Skills ({applicantDetails.skills.length})</h4>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {applicantDetails.skills.map((sk, i) => (
                                                    <span key={i} className="badge badge-blue" style={{ fontSize: 12 }}>
                                                        {sk.skills?.name || '—'}
                                                        {sk.proficiency_score > 0 && ` (${Math.round(sk.proficiency_score)}%)`}
                                                    </span>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* Certifications */}
                                    {applicantDetails.certs.length > 0 && (
                                        <section className="card" style={{ padding: 20 }}>
                                            <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Certifications ({applicantDetails.certs.length})</h4>
                                            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                                                {applicantDetails.certs.map((c, i) => (
                                                    <li key={i} style={{ marginBottom: 6 }}>
                                                        <strong>{c.title}</strong>
                                                        {c.issued_by && ` — ${c.issued_by}`}
                                                        {c.issued_at && ` (${c.issued_at})`}
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}

                                    {/* Cover Letter */}
                                    {selectedApplicant.cover_letter && (
                                        <section className="card" style={{ padding: 20 }}>
                                            <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Cover Letter</h4>
                                            <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{selectedApplicant.cover_letter}</p>
                                        </section>
                                    )}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Could not load profile.</p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={closeProfile}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
