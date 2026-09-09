import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../services/apiClient';

export default function IndustryTalent() {
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shortlisted, setShortlisted] = useState(new Set());

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            try {
                const data = await apiFetch('/api/industry/talent');
                if (mounted && data) {
                    setCandidates(data);
                }
            } catch (err) {
                console.error('Failed to fetch talent pool:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    const filtered = useMemo(() => {
        return candidates.filter(c => {
            const matchesQuery = !search || 
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                (c.skills || []).some(s => s.toLowerCase().includes(search.toLowerCase())) ||
                c.college.toLowerCase().includes(search.toLowerCase());
            const matchesDept = deptFilter === 'All' || (c.dept || '').toLowerCase().includes(deptFilter.toLowerCase());
            return matchesQuery && matchesDept;
        });
    }, [candidates, search, deptFilter]);

    const toggleShortlist = (id) => {
        setShortlisted(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const [toast, setToast] = useState(null);
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };
    const exportShortlistCSV = () => {
        const shortlistedCandidates = candidates.filter(c => shortlisted.has(c.id));
        if (!shortlistedCandidates.length) {
            showToast('No candidates shortlisted yet. Click "Shortlist" on a candidate first.', 'error');
            return;
        }
        try {
            const headers = ['Name', 'College', 'Department', 'CGPA', 'Match %', 'Skills'];
            const escape  = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const rows    = shortlistedCandidates.map(c => [
                c.name, c.college, c.dept || '', c.cgpa ?? '', c.match ?? '',
                (c.skills || []).join('; '),
            ].map(escape).join(','));
            const csv  = [headers.map(escape).join(','), ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url; a.download = `shortlist_${Date.now()}.csv`; a.click();
            URL.revokeObjectURL(url);
            showToast(`✓ ${shortlistedCandidates.length} candidate${shortlistedCandidates.length > 1 ? 's' : ''} exported`);
        } catch (err) {
            console.error('Export shortlist error:', err);
            showToast('Unable to export shortlist. Please try again.', 'error');
        }
    };

    return (
        <main className="dashboard-area">
            {/* In-app toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
                    padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    background: toast.type === 'error' ? '#FEF2F2' : '#ECFDF5',
                    color:      toast.type === 'error' ? '#991B1B'  : '#065F46',
                    border:     `1px solid ${toast.type === 'error' ? '#FECACA' : '#A7F3D0'}`,
                }}>
                    <i className={`ph-fill ${toast.type === 'error' ? 'ph-warning-circle' : 'ph-check-circle'}`} style={{ fontSize: 16 }} />
                    {toast.msg}
                </div>
            )}
            <div className="dashboard-header">
                <div>
                    <h2>Talent Pool &amp; Candidate Discovery</h2>
                    <p className="subtitle">Search, filter, and shortlist verified engineering talent across partner campuses.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-outline" type="button" onClick={exportShortlistCSV}>
                        <i className="ph ph-download-simple"></i> Export Shortlist
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <section className="card" style={{ padding: '20px 24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="search-bar" style={{ flex: '1 1 300px', width: 'auto' }}>
                        <i className="ph ph-magnifying-glass"></i>
                        <input
                            type="text"
                            placeholder="Search by candidate name, skill (Python, Docker, SQL)..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <select
                            className="form-control"
                            style={{ width: 'auto', borderRadius: '20px', padding: '8px 16px', background: 'var(--bg-light)', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                        >
                            <option value="All">All Departments</option>
                            <option value="Computer Science">Computer Science</option>
                            <option value="Information Technology">Information Technology</option>
                            <option value="Data Science">Data Science</option>
                            <option value="Electronics">Electronics</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Talent List */}
            <section className="card">
                <div className="card-header">
                    <div>
                        <h3>Candidate Matches ({filtered.length})</h3>
                        <p className="subtitle">AI-matched according to technical depth and verified portfolio scores.</p>
                    </div>
                </div>
                <div className="talent-list">
                    {filtered.map(cand => {
                        const isShortlisted = shortlisted.has(cand.id);
                        return (
                            <div className="talent-card" key={cand.id}>
                                <div className="talent-basic">
                                    <img src={cand.avatar} alt={cand.name} className="avatar-lg" />
                                    <div className="talent-info">
                                        <h4>{cand.name}</h4>
                                        <p className="college">{cand.college} • CGPA: {cand.cgpa}</p>
                                        <div className="skills-wrap">
                                            {cand.skills.map(s => (
                                                <span className="skill-pill" key={s}>{s}</span>
                                            ))}
                                        </div>
                                        {cand.gap && (
                                            <div className="skill-gap text-danger mt-8" style={{ fontSize: '12.5px', fontWeight: 600 }}>
                                                <i className="ph-fill ph-warning-circle"></i> Deficit Gap: {cand.gap}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="talent-meta">
                                    <div className="match-score">
                                        <div className="score-text"><span>{cand.match}%</span> Match</div>
                                        <div className="progress-bar">
                                            <div
                                                className={`progress-fill ${cand.match >= 90 ? 'excellent' : 'good'}`}
                                                style={{ width: `${cand.match}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="talent-stats">{cand.stats}</div>
                                    <div className="talent-actions">
                                        <button
                                            className="btn btn-outline"
                                            type="button"
                                            onClick={() => alert(`Previewing verified digital portfolio for ${cand.name}...`)}
                                        >
                                            View Portfolio
                                        </button>
                                        <button
                                            className={`btn btn-primary btn-shortlist ${isShortlisted ? 'shortlisted' : ''}`}
                                            type="button"
                                            onClick={() => toggleShortlist(cand.id)}
                                        >
                                            {isShortlisted ? (
                                                <>Shortlisted <i className="ph ph-check"></i></>
                                            ) : (
                                                'Shortlist'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No candidates found matching the selected search query or department.
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
