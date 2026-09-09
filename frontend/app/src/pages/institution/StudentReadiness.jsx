import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PortfolioModal from '../../components/modals/PortfolioModal';
import { useAuth } from '../../context/AuthContext';
import { fetchInstitutionStudents } from '../../services/institutionService';

// ─── Readiness helpers ────────────────────────────────────────────────────────
function readinessLabel(score) {
    if (score === null || score === undefined) return null;
    if (score >= 70) return 'Strong';
    if (score >= 40) return 'Developing';
    return 'Needs Attention';
}

function readinessColorClass(score) {
    if (score === null || score === undefined) return 'bg-muted';
    if (score >= 70) return 'bg-success';
    if (score >= 40) return 'bg-warning';
    return 'bg-danger';
}

export default function StudentReadiness() {
    const { accessToken } = useAuth();

    // ── State ─────────────────────────────────────────────────────────────────
    const [students, setStudents]     = useState([]);
    const [loading, setLoading]       = useState(true);
    const [apiError, setApiError]     = useState(null);

    const [search, setSearch]   = useState('');
    const [dept, setDept]       = useState('All Departments');
    const [status, setStatus]   = useState('All Readiness Status');

    const [portfolioStudentId, setPortfolioStudentId] = useState(null);

    // ── Fetch real students on mount ──────────────────────────────────────────
    const loadStudents = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        setApiError(null);
        try {
            const data = await fetchInstitutionStudents(accessToken);
            setStudents(data);
        } catch (err) {
            console.error('Institution student list error:', err);
            setApiError(err.message || 'Unable to load student data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    // ── Unique department options derived exclusively from real database data ─
    const deptOptions = useMemo(() => {
        const domains = students
            .map(s => s.domain)
            .filter(Boolean);
        return [...new Set(domains)].sort();
    }, [students]);

    // ── Filtered real students ────────────────────────────────────────────────
    const filteredStudents = useMemo(() => {
        const query = search.toLowerCase().trim();

        return students.filter(student => {
            const skillNames = (student.skills || []).map(sk =>
                typeof sk === 'string' ? sk : (sk.name || '')
            ).join(' ');

            const rowText = [
                student.full_name || '',
                student.email || '',
                student.domain || '',
                skillNames,
            ].join(' ').toLowerCase();

            const matchesQuery = !query || rowText.includes(query);

            const studentDept = (student.domain || '').toUpperCase();
            const matchesDept = dept === 'All Departments' || studentDept === dept.toUpperCase();

            let matchesStatus = true;
            if (status !== 'All Readiness Status') {
                const label = readinessLabel(student.readiness_score);
                matchesStatus = label === status;
            }

            return matchesQuery && matchesDept && matchesStatus;
        });
    }, [students, search, dept, status]);

    // ── Statistics (Real Database Students Only) ──────────────────────────────
    const stats = useMemo(() => {
        const assessed = students.filter(s => s.readiness_score !== null && s.readiness_score !== undefined);
        const avgReadiness = assessed.length
            ? Math.round(assessed.reduce((sum, s) => sum + s.readiness_score, 0) / assessed.length)
            : null;
        return { total: students.length, assessed: assessed.length, avgReadiness };
    }, [students]);

    // ── Render helpers ────────────────────────────────────────────────────────
    const MAX_VISIBLE_SKILLS = 3;

    function renderSkills(student) {
        const skills = student.skills || [];
        if (skills.length === 0) {
            return <span className="text-muted" style={{ fontSize: '12.5px' }}>No skills added yet</span>;
        }

        // Sort skills: verified first, then highest proficiency score
        const sortedSkills = [...skills].sort((a, b) => {
            const aVer = typeof a === 'string' ? true : !!a.is_verified;
            const bVer = typeof b === 'string' ? true : !!b.is_verified;
            if (aVer !== bVer) return aVer ? -1 : 1;
            const aScore = typeof a === 'string' ? 0 : (a.proficiency_score || 0);
            const bScore = typeof b === 'string' ? 0 : (b.proficiency_score || 0);
            return bScore - aScore;
        });

        const visibleSkills = sortedSkills.slice(0, MAX_VISIBLE_SKILLS);
        const remainingCount = sortedSkills.length - MAX_VISIBLE_SKILLS;
        const remainingNames = remainingCount > 0
            ? sortedSkills.slice(MAX_VISIBLE_SKILLS).map(sk => typeof sk === 'string' ? sk : sk.name).join(', ')
            : '';

        return (
            <div className="tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                {visibleSkills.map(sk => {
                    const name     = typeof sk === 'string' ? sk : sk.name;
                    const verified = typeof sk === 'string' ? true : sk.is_verified;
                    return (
                        <span className="tag" key={name} title={verified ? 'Verified Skill' : 'Self-reported Skill'}>
                            {verified && <i className="ph-fill ph-check-circle text-success" style={{ marginRight: 3 }} />}
                            {name}
                        </span>
                    );
                })}
                {remainingCount > 0 && (
                    <span
                        className="tag text-muted"
                        title={`Other skills: ${remainingNames}`}
                        style={{ background: '#f1f5f9', cursor: 'default', fontSize: '11px', fontWeight: 600 }}
                    >
                        +{remainingCount} more
                    </span>
                )}
            </div>
        );
    }

    function renderReadiness(student) {
        const score = student.readiness_score;
        if (score === null || score === undefined) {
            return (
                <span className="text-muted" style={{ fontSize: '12.5px' }}>
                    Not enough data
                </span>
            );
        }
        const label     = readinessLabel(score);
        const fillClass = readinessColorClass(score);
        return (
            <div className="readiness-cell">
                <span className="font-semibold">{score}%</span>
                <span className="text-muted" style={{ fontSize: '11px', marginLeft: 6 }}>{label}</span>
                <div className="mini-progress">
                    <div className={`fill ${fillClass}`} style={{ width: `${Math.min(score, 100)}%` }} />
                </div>
            </div>
        );
    }

    // ── Export Real Student Registry to CSV ──────────────────────────────────
    const handleExportCSV = () => {
        if (!students.length) {
            alert('No student records available to export.');
            return;
        }

        const headers = ['Student Name', 'Email', 'Domain', 'Verified Skills', 'All Skills', 'Readiness Score (%)', 'Status'];
        const csvRows = [headers.join(',')];

        students.forEach(s => {
            const verifiedSkills = (s.skills || []).filter(sk => typeof sk !== 'string' && sk.is_verified).map(sk => sk.name).join('; ');
            const allSkills = (s.skills || []).map(sk => typeof sk === 'string' ? sk : sk.name).join('; ');
            const score = s.readiness_score != null ? `${s.readiness_score}%` : 'Not Assessed';
            const statusLabel = readinessLabel(s.readiness_score) || 'Not Assessed';

            const row = [
                `"${(s.full_name || '').replace(/"/g, '""')}"`,
                `"${(s.email || '').replace(/"/g, '""')}"`,
                `"${(s.domain || 'Not Specified').replace(/"/g, '""')}"`,
                `"${verifiedSkills.replace(/"/g, '""')}"`,
                `"${allSkills.replace(/"/g, '""')}"`,
                `"${score}"`,
                `"${statusLabel}"`,
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Student_Skill_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!accessToken) {
        return (
            <main className="view-section active">
                <div className="dashboard-header">
                    <div>
                        <h2>Student Skill Development &amp; Industry Readiness</h2>
                        <p className="subtitle">Please log in to view student data.</p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="view-section active">

            <div className="dashboard-header">
                <div>
                    <h2>Student Skill Development &amp; Industry Readiness</h2>
                    <p className="subtitle">
                        Maintain student skill profiles, track aptitude assessment results, and review verified digital portfolios.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={handleExportCSV}>
                    <i className="ph ph-download-simple" /> Export Skill Registry
                </button>
            </div>

            {/* ── Real Database Statistics Bar ───────────────────────────────── */}
            {!loading && !apiError && stats.total > 0 && (
                <div className="stats-grid grid-3 mb-24">
                    <div className="stat-card">
                        <div className="stat-icon bg-blue-light text-blue">
                            <i className="ph ph-users-three" />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.total}</span>
                            <span className="stat-label">Enrolled Students</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon bg-success-light text-success">
                            <i className="ph ph-check-circle" />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.assessed}</span>
                            <span className="stat-label">Evaluated</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon bg-warning-light text-warning">
                            <i className="ph ph-trend-up" />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.avgReadiness !== null ? `${stats.avgReadiness}%` : '0%'}</span>
                            <span className="stat-label">Avg. Readiness</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Filters ───────────────────────────────────────────────────── */}
            <div className="card p-24 mb-24">
                <div className="filter-bar">
                    <div className="search-bar" style={{ width: '320px' }}>
                        <i className="ph ph-magnifying-glass" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or skill..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="filters">
                        <select className="form-select" value={dept} onChange={(e) => setDept(e.target.value)}>
                            <option>All Departments</option>
                            {deptOptions.map(d => <option key={d}>{d}</option>)}
                        </select>
                        <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option>All Readiness Status</option>
                            <option>Strong</option>
                            <option>Developing</option>
                            <option>Needs Attention</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Main table ────────────────────────────────────────────────── */}
            <div className="card">
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Dept &amp; Domain</th>
                                <th>Technical Skills</th>
                                <th>Aptitude / Soft Skills</th>
                                <th>Industry Readiness</th>
                                <th>Digital Portfolio</th>
                            </tr>
                        </thead>
                        <tbody>

                            {/* Loading state */}
                            {loading && (
                                <tr>
                                    <td colSpan="6" className="text-center text-muted" style={{ padding: '32px' }}>
                                        <i className="ph ph-spinner" style={{ marginRight: 8 }} />
                                        Loading real student records from database…
                                    </td>
                                </tr>
                            )}

                            {/* Error state */}
                            {!loading && apiError && (
                                <tr>
                                    <td colSpan="6" style={{ padding: '32px', textAlign: 'center' }}>
                                        <div style={{ color: 'var(--danger, #dc3545)', marginBottom: 12 }}>
                                            <i className="ph ph-warning-circle" style={{ marginRight: 6 }} />
                                            {apiError}
                                        </div>
                                        <button className="btn btn-outline" onClick={loadStudents}>
                                            <i className="ph ph-arrow-clockwise" /> Retry
                                        </button>
                                    </td>
                                </tr>
                            )}

                            {/* Real student rows */}
                            {!loading && !apiError && filteredStudents.map(student => (
                                <tr key={student.id}>
                                    <td>
                                        <div className="table-user">
                                            <div className="avatar-sm bg-blue-light text-blue">{student.initials}</div>
                                            <div>
                                                <span className="font-semibold">{student.full_name}</span>
                                                <span className="sub-text">{student.email || 'No email provided'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{student.domain || '—'}</td>
                                    <td>
                                        {renderSkills(student)}
                                    </td>
                                    <td>
                                        <span className="badge-status bg-muted-light text-muted" style={{ fontSize: '12px' }}>
                                            Not assessed
                                        </span>
                                    </td>
                                    <td>{renderReadiness(student)}</td>
                                    <td>
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => setPortfolioStudentId(student.id)}
                                        >
                                            <i className="ph ph-eye" /> View Portfolio
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {/* No results */}
                            {!loading && !apiError && filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center text-muted" style={{ padding: '32px' }}>
                                        No students found matching the selected criteria.
                                    </td>
                                </tr>
                            )}

                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Portfolio Modal ───────────────────────────────────────────── */}
            {portfolioStudentId !== null && (
                <PortfolioModal
                    studentId={portfolioStudentId}
                    accessToken={accessToken}
                    onClose={() => setPortfolioStudentId(null)}
                />
            )}

        </main>
    );
}
