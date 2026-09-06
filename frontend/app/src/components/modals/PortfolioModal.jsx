import React, { useState, useEffect } from 'react';
import { fetchStudentPortfolio } from '../../services/institutionService';

/**
 * PortfolioModal
 *
 * Props:
 *   studentId   {string}   — student UUID
 *   accessToken {string}   — Supabase JWT
 *   onClose     {Function}
 */
export default function PortfolioModal({ studentId, accessToken, onClose }) {
    const [endorsed, setEndorsed] = useState(false);

    const [portfolio, setPortfolio]           = useState(null);
    const [loadingPort, setLoadingPort]       = useState(false);
    const [portfolioError, setPortfolioError] = useState(null);

    // ── Keyboard accessibility & scroll lock ─────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = originalOverflow;
        };
    }, [onClose]);

    // ── Fetch real portfolio on open ──────────────────────────────────────────
    useEffect(() => {
        if (!studentId || !accessToken) return;

        let cancelled = false;
        setLoadingPort(true);
        setPortfolioError(null);
        setPortfolio(null);

        fetchStudentPortfolio(studentId, accessToken)
            .then(data => {
                if (!cancelled) setPortfolio(data);
            })
            .catch(err => {
                if (!cancelled) setPortfolioError(err.message || 'Failed to load portfolio.');
            })
            .finally(() => {
                if (!cancelled) setLoadingPort(false);
            });

        return () => { cancelled = true; };
    }, [studentId, accessToken]);

    // ── Shared modal shell ────────────────────────────────────────────────────
    function Shell({ title, children, showEndorse = false }) {
        return (
            <div className="modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
                <div className="modal-container" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>{title}</h3>
                        <button className="icon-btn" onClick={onClose}><i className="ph ph-x" /></button>
                    </div>
                    <div className="modal-body">{children}</div>
                    <div className="modal-footer">
                        <button className="btn btn-outline" onClick={onClose}>Close</button>
                        {showEndorse && (
                            <button
                                className={endorsed ? 'btn bg-success' : 'btn btn-primary'}
                                style={endorsed ? { color: 'white', border: 'none' } : undefined}
                                onClick={() => setEndorsed(e => !e)}
                            >
                                {endorsed
                                    ? <><i className="ph-fill ph-check-circle" /> Endorsed</>
                                    : <><i className="ph ph-thumbs-up" /> Endorse for Placement</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (loadingPort) {
        return (
            <Shell title="Loading Portfolio…">
                <p className="text-muted" style={{ padding: '24px 0', textAlign: 'center' }}>
                    <i className="ph ph-spinner" style={{ marginRight: 6 }} />
                    Fetching student portfolio records…
                </p>
            </Shell>
        );
    }

    // ── Portfolio fetch error ─────────────────────────────────────────────────
    if (portfolioError) {
        return (
            <Shell title="Portfolio Unavailable">
                <p className="text-muted" style={{ color: 'var(--danger, #dc3545)', padding: '16px 0' }}>
                    <i className="ph ph-warning-circle" style={{ marginRight: 6 }} />
                    {portfolioError}
                </p>
            </Shell>
        );
    }

    if (!portfolio) {
        return (
            <Shell title="Portfolio Not Available">
                <p className="text-muted">No portfolio data found for this student.</p>
            </Shell>
        );
    }

    const { student, verified_skills, certifications, projects } = portfolio;

    return (
        <Shell title="Verified Digital Student Portfolio" showEndorse>
            {/* ── Student header ── */}
            <div className="academician-lead-card mb-24">
                <div
                    className="avatar-2xl bg-blue-light text-blue font-bold"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}
                >
                    {student.initials}
                </div>
                <div>
                    <h4>{student.full_name}</h4>
                    <p className="designation">{student.domain || 'Domain not set'}</p>
                    {student.email && (
                        <p className="affiliation" style={{ fontSize: '13px', color: 'var(--muted)' }}>
                            {student.email}
                        </p>
                    )}
                    {(student.github_url || student.linkedin_url || student.portfolio_url) && (
                        <p className="affiliation" style={{ fontSize: '12px', marginTop: 4 }}>
                            {student.github_url && (
                                <a href={student.github_url} target="_blank" rel="noopener noreferrer" style={{ marginRight: 10 }}>
                                    <i className="ph ph-github-logo" /> GitHub
                                </a>
                            )}
                            {student.linkedin_url && (
                                <a href={student.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ marginRight: 10 }}>
                                    <i className="ph ph-linkedin-logo" /> LinkedIn
                                </a>
                            )}
                            {student.portfolio_url && (
                                <a href={student.portfolio_url} target="_blank" rel="noopener noreferrer">
                                    <i className="ph ph-link" /> Portfolio
                                </a>
                            )}
                        </p>
                    )}
                </div>
            </div>

            {/* ── Verified skills ── */}
            <h4 className="font-bold mb-8" style={{ fontSize: '14px' }}>1. Verified Technical Skills</h4>
            <div className="tags mb-16">
                {verified_skills && verified_skills.length > 0
                    ? verified_skills.map(sk => (
                        <span className="tag" key={sk.name}>
                            <i className="ph-fill ph-check-circle text-success" /> {sk.name}
                            {sk.proficiency_score != null && (
                                <span style={{ marginLeft: 4, fontSize: '11px', opacity: 0.7 }}>
                                    ({Math.round(sk.proficiency_score)}%)
                                </span>
                            )}
                        </span>
                    ))
                    : <span className="text-muted" style={{ fontSize: '13px' }}>No verified skills yet.</span>
                }
            </div>

            {/* ── Certifications ── */}
            <h4 className="font-bold mb-8" style={{ fontSize: '14px' }}>2. Industry Certifications</h4>
            <div className="publication-badge-list mb-16">
                {certifications && certifications.length > 0
                    ? certifications.map((cert, i) => (
                        <div className="pub-item" key={cert.id || i}>
                            <div className="pub-title">
                                {cert.credential_url ? (
                                    <a href={cert.credential_url} target="_blank" rel="noopener noreferrer">
                                        {cert.title}
                                    </a>
                                ) : (
                                    cert.title
                                )}
                            </div>
                            <div className="pub-meta">
                                {cert.issued_by}
                                {cert.issued_at && ` • ${new Date(cert.issued_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}
                            </div>
                        </div>
                    ))
                    : <p className="text-muted" style={{ fontSize: '13px' }}>No certifications added yet.</p>
                }
            </div>

            {/* ── Projects ── */}
            <h4 className="font-bold mb-8" style={{ fontSize: '14px' }}>3. Projects</h4>
            <div className="experience-timeline">
                {projects && projects.length > 0
                    ? projects.map((proj, i) => (
                        <div className="exp-item" key={proj.id || i}>
                            <h5>
                                {proj.project_url
                                    ? <a href={proj.project_url} target="_blank" rel="noopener noreferrer">{proj.title}</a>
                                    : proj.title
                                }
                            </h5>
                            {proj.description && <p>{proj.description}</p>}
                            {(proj.tags || []).length > 0 && (
                                <div className="tags" style={{ marginTop: 4 }}>
                                    {proj.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}
                                </div>
                            )}
                            {(proj.start_date || proj.end_date) && (
                                <span className="exp-duration">
                                    {proj.start_date && new Date(proj.start_date).getFullYear()}
                                    {proj.end_date && ` – ${new Date(proj.end_date).getFullYear()}`}
                                </span>
                            )}
                        </div>
                    ))
                    : <p className="text-muted" style={{ fontSize: '13px' }}>No portfolio projects yet.</p>
                }
            </div>
        </Shell>
    );
}
