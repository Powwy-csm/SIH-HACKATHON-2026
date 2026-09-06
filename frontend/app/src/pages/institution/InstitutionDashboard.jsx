import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchInstitutionStudents } from '../../services/institutionService';

export default function InstitutionDashboard() {
    const navigate = useNavigate();
    const { accessToken } = useAuth();

    const [students, setStudents]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [apiError, setApiError]   = useState(null);

    // ── Fetch real student data from Supabase ─────────────────────────────────
    const loadDashboardData = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        setApiError(null);
        try {
            const data = await fetchInstitutionStudents(accessToken);
            setStudents(data);
        } catch (err) {
            console.error('Institution dashboard data error:', err);
            setApiError(err.message || 'Unable to load real student records.');
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // ── Live statistics computed from real database records ───────────────────
    const metrics = useMemo(() => {
        const total = students.length;
        const evaluated = students.filter(s => s.readiness_score !== null && s.readiness_score !== undefined);
        const avgReadiness = evaluated.length
            ? Math.round(evaluated.reduce((sum, s) => sum + s.readiness_score, 0) / evaluated.length)
            : 0;

        const placementReady = students.filter(s => (s.readiness_score || 0) >= 70).length;
        const developing = students.filter(s => (s.readiness_score || 0) >= 40 && (s.readiness_score || 0) < 70).length;
        const needsAttention = students.filter(s => s.readiness_score === null || s.readiness_score < 40).length;

        return {
            total,
            evaluatedCount: evaluated.length,
            avgReadiness,
            placementReady,
            developing,
            needsAttention,
        };
    }, [students]);

    // ── CSV summary report export ─────────────────────────────────────────────
    const handleExportReport = () => {
        if (!students.length) {
            alert('No student records available to export.');
            return;
        }

        const rows = [
            ['Metric', 'Value'],
            ['Total Enrolled Students', `${metrics.total}`],
            ['Evaluated Students', `${metrics.evaluatedCount}`],
            ['Average Campus Readiness', `${metrics.avgReadiness}%`],
            ['Placement-Ready Students (Score >= 70%)', `${metrics.placementReady}`],
            ['Developing Skills (Score 40-69%)', `${metrics.developing}`],
            ['Needs Attention / Incomplete Evaluation', `${metrics.needsAttention}`],
            ['Generated At', new Date().toLocaleString()],
            [],
            ['Student Name', 'Email', 'Domain', 'Readiness Score (%)'],
            ...students.map(s => [
                `"${(s.full_name || '').replace(/"/g, '""')}"`,
                `"${(s.email || '').replace(/"/g, '""')}"`,
                `"${(s.domain || 'Not Specified').replace(/"/g, '""')}"`,
                s.readiness_score != null ? `${s.readiness_score}%` : 'Not Assessed'
            ])
        ];

        const csvContent = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Institution_Overview_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <main className="view-section active">

            {/* =====================================================
                HEADER
            ===================================================== */}
            <div className="dashboard-header mb-32">
                <div>
                    <h2>Institution Overview</h2>
                    <p className="subtitle">
                        Live campus readiness analytics, student progress tracking, and industry opportunities.
                    </p>
                </div>

                <button className="btn btn-primary" onClick={handleExportReport}>
                    <i className="ph ph-download-simple"></i>
                    Export Report
                </button>
            </div>

            {/* =====================================================
                TOP STATISTICS (LIVE FROM REAL SUPABASE DATA)
            ===================================================== */}
            <div className="stats-grid mb-32">

                <div className="stat-card">
                    <div className="stat-icon bg-blue-light text-blue">
                        <i className="ph ph-users-three"></i>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">
                            {loading ? '…' : metrics.total}
                        </span>
                        <span className="stat-label">
                            Registered Students
                        </span>
                        <span className="stat-trend success">
                            <i className="ph ph-database"></i> Live Database
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon bg-success-light text-success">
                        <i className="ph ph-chart-line-up"></i>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">
                            {loading ? '…' : `${metrics.avgReadiness}%`}
                        </span>
                        <span className="stat-label">
                            Average Readiness
                        </span>
                        <span className="stat-trend success">
                            <i className="ph ph-seal-check"></i> Evaluated
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon bg-purple-light text-purple">
                        <i className="ph ph-briefcase"></i>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">
                            {loading ? '…' : metrics.placementReady}
                        </span>
                        <span className="stat-label">
                            Placement Ready (≥70%)
                        </span>
                        <span className="stat-trend success">
                            <i className="ph ph-trend-up"></i> Top Performers
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon bg-warning-light text-warning">
                        <i className="ph ph-chalkboard-teacher"></i>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">
                            {loading ? '…' : metrics.developing}
                        </span>
                        <span className="stat-label">
                            In Upskilling (40-69%)
                        </span>
                        <span className="stat-trend warning">
                            <i className="ph ph-arrow-clockwise"></i> In Progress
                        </span>
                    </div>
                </div>

            </div>

            {/* =====================================================
                REAL STUDENT READINESS + SKILL DEMAND
            ===================================================== */}
            <div className="summary-grid mb-32">

                {/* Real Student Readiness List */}
                <section className="card">

                    <div className="card-header">
                        <div>
                            <h3>Student Readiness</h3>
                            <p className="subtitle">
                                Live overview of registered students based on evaluated skill proficiency.
                            </p>
                        </div>

                        <button className="btn btn-text" onClick={() => navigate('/institution/students')}>
                            View All
                            <i className="ph ph-arrow-right"></i>
                        </button>
                    </div>

                    <div className="card-body">
                        <div className="gap-summary-list">

                            {loading && (
                                <p className="text-muted" style={{ padding: '24px 0', textAlign: 'center' }}>
                                    <i className="ph ph-spinner" style={{ marginRight: 6 }} />
                                    Loading real student readiness…
                                </p>
                            )}

                            {!loading && apiError && (
                                <div style={{ padding: '16px', color: 'var(--danger, #dc3545)', textAlign: 'center' }}>
                                    <i className="ph ph-warning-circle" style={{ marginRight: 6 }} />
                                    {apiError}
                                </div>
                            )}

                            {!loading && !apiError && students.length === 0 && (
                                <p className="text-muted" style={{ padding: '24px 0', textAlign: 'center' }}>
                                    No student records found in the database.
                                </p>
                            )}

                            {!loading && !apiError && students.slice(0, 5).map(student => {
                                const score = student.readiness_score;
                                const fillClass = score >= 70 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-danger';

                                return (
                                    <div className="gap-sum-item" key={student.id}>
                                        <div className="gap-sum-label">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <strong>{student.full_name}</strong>
                                                <span className="text-muted" style={{ fontSize: '12.5px' }}>
                                                    {student.domain || 'Domain not specified'} • {student.email}
                                                </span>
                                            </div>

                                            <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                                                {score != null ? `${score}%` : 'Not Assessed'}
                                            </strong>
                                        </div>

                                        <div className="progress-bar">
                                            <div
                                                className={`progress-fill ${fillClass}`}
                                                style={{ width: `${Math.min(score || 0, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}

                        </div>
                    </div>

                </section>

                {/* Industry Demand & Skill Gaps */}
                <section className="card">

                    <div className="card-header">
                        <div>
                            <h3>Industry Demand &amp; Skill Gaps</h3>
                            <p className="subtitle">
                                High-priority skills requested across campus opportunities.
                            </p>
                        </div>

                        <button className="btn btn-text" onClick={() => navigate('/institution/demand')}>
                            Explore
                            <i className="ph ph-arrow-right"></i>
                        </button>
                    </div>

                    <div className="card-body">
                        <div className="demand-summary-list">

                            <div className="demand-sum-item">
                                <div className="gap-sum-label" style={{ marginBottom: '6px' }}>
                                    <span>Python &amp; Data Engineering</span>
                                    <strong>86%</strong>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill bg-success" style={{ width: '86%' }}></div>
                                </div>
                            </div>

                            <div className="demand-sum-item">
                                <div className="gap-sum-label" style={{ marginBottom: '6px' }}>
                                    <span>Cloud Platforms &amp; DevOps</span>
                                    <strong>78%</strong>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill bg-blue" style={{ width: '78%' }}></div>
                                </div>
                            </div>

                            <div className="demand-sum-item">
                                <div className="gap-sum-label" style={{ marginBottom: '6px' }}>
                                    <span>Generative AI &amp; LLM Application</span>
                                    <strong>74%</strong>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill bg-purple" style={{ width: '74%' }}></div>
                                </div>
                            </div>

                            <div className="demand-sum-item">
                                <div className="gap-sum-label" style={{ marginBottom: '6px' }}>
                                    <span>Full Stack Web Architecture</span>
                                    <strong>69%</strong>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill bg-warning" style={{ width: '69%' }}></div>
                                </div>
                            </div>

                        </div>
                    </div>

                </section>

            </div>

            {/* =====================================================
                RECENT OPPORTUNITIES
            ===================================================== */}
            <section className="card mb-32">

                <div className="card-header">
                    <div>
                        <h3>Recent Industry Opportunities</h3>
                        <p className="subtitle">
                            Latest opportunities and collaborations available for your students.
                        </p>
                    </div>

                    <button className="btn btn-text" onClick={() => navigate('/institution/opportunities')}>
                        View All
                        <i className="ph ph-arrow-right"></i>
                    </button>
                </div>

                <div className="card-body">
                    <div className="opp-summary-grid">

                        <div className="opp-summary-card">
                            <div>
                                <span className="badge-status bg-success-light text-success" style={{ marginBottom: '10px', display: 'inline-block' }}>
                                    Internship
                                </span>
                                <h4>Machine Learning Intern</h4>
                                <p className="text-muted" style={{ fontSize: '13.5px', marginTop: '4px' }}>ABC Technologies</p>
                            </div>
                            <span className="match-text text-primary" style={{ marginTop: '12px' }}>
                                <i className="ph ph-check-circle"></i> {metrics.placementReady} eligible students
                            </span>
                        </div>

                        <div className="opp-summary-card">
                            <div>
                                <span className="badge-status bg-blue-light text-blue" style={{ marginBottom: '10px', display: 'inline-block' }}>
                                    Live Project
                                </span>
                                <h4>AI Research Collaboration</h4>
                                <p className="text-muted" style={{ fontSize: '13.5px', marginTop: '4px' }}>Industry Research Lab</p>
                            </div>
                            <span className="match-text text-primary" style={{ marginTop: '12px' }}>
                                <i className="ph ph-users"></i> {metrics.total} students in domain
                            </span>
                        </div>

                        <div className="opp-summary-card">
                            <div>
                                <span className="badge-status bg-purple-light text-purple" style={{ marginBottom: '10px', display: 'inline-block' }}>
                                    Workshop
                                </span>
                                <h4>Cloud Engineering Bootcamp</h4>
                                <p className="text-muted" style={{ fontSize: '13.5px', marginTop: '4px' }}>TechNova Solutions</p>
                            </div>
                            <span className="match-text text-primary" style={{ marginTop: '12px' }}>
                                <i className="ph ph-sparkle"></i> Open for enrollment
                            </span>
                        </div>

                    </div>
                </div>

            </section>

            {/* =====================================================
                STUDENT PROGRESS & PLACEMENT READINESS
            ===================================================== */}
            <section className="card">

                <div className="card-header">
                    <div>
                        <h3>Student Progress &amp; Readiness Tiers</h3>
                        <p className="subtitle">
                            Real-time distribution of student competency across readiness thresholds.
                        </p>
                    </div>

                    <button className="btn btn-outline" onClick={() => navigate('/institution/students')}>
                        View Full Registry
                    </button>
                </div>

                <div className="card-body">
                    <div className="timeline-horizontal-grid" style={{ padding: 0 }}>

                        <div className="timeline-card-item">
                            <div className="timeline-icon bg-success-light text-success">
                                <i className="ph ph-check-circle"></i>
                            </div>
                            <div className="timeline-content">
                                <strong className="timeline-value">
                                    {loading ? '…' : metrics.placementReady}
                                </strong>
                                <span className="time">
                                    Placement Ready (Score ≥ 70%)
                                </span>
                            </div>
                        </div>

                        <div className="timeline-card-item">
                            <div className="timeline-icon bg-warning-light text-warning">
                                <i className="ph ph-arrow-clockwise"></i>
                            </div>
                            <div className="timeline-content">
                                <strong className="timeline-value">
                                    {loading ? '…' : metrics.developing}
                                </strong>
                                <span className="time">
                                    In Training &amp; Upskilling (40–69%)
                                </span>
                            </div>
                        </div>

                        <div className="timeline-card-item">
                            <div className="timeline-icon bg-blue-light text-blue">
                                <i className="ph ph-user-list"></i>
                            </div>
                            <div className="timeline-content">
                                <strong className="timeline-value">
                                    {loading ? '…' : metrics.needsAttention}
                                </strong>
                                <span className="time">
                                    Pending Assessment / Low Score
                                </span>
                            </div>
                        </div>

                    </div>
                </div>

            </section>

        </main>
    );
}