import React, { useState, useEffect } from 'react';
import { fetchStudentPortfolio } from '../../services/institutionService';
import { getAccessToken } from '../../services/apiClient';

/**
 * PortfolioModal
 *
 * Props:
 *   studentId   {string}   — student UUID
 *   accessToken {string}   — Supabase JWT (optional, falls back to active session)
 *   onClose     {Function}
 */
export default function PortfolioModal({ studentId, accessToken, onClose }) {
    const [endorsed, setEndorsed] = useState(() => {
        try {
            return localStorage.getItem(`endorsed_student_${studentId}`) === 'true';
        } catch {
            return false;
        }
    });

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
        if (!studentId) return;

        let cancelled = false;
        setLoadingPort(true);
        setPortfolioError(null);
        setPortfolio(null);

        const run = async () => {
            try {
                const token = accessToken || (await getAccessToken());
                if (!token) {
                    throw new Error('Authentication session required to view portfolio.');
                }
                const data = await fetchStudentPortfolio(studentId, token);
                if (!cancelled) setPortfolio(data);
            } catch (err) {
                if (!cancelled) setPortfolioError(err.message || 'Failed to load portfolio.');
            } finally {
                if (!cancelled) setLoadingPort(false);
            }
        };

        run();

        return () => { cancelled = true; };
    }, [studentId, accessToken]);

    const handleToggleEndorse = () => {
        setEndorsed(prev => {
            const next = !prev;
            try {
                if (next) {
                    localStorage.setItem(`endorsed_student_${studentId}`, 'true');
                } else {
                    localStorage.removeItem(`endorsed_student_${studentId}`);
                }
            } catch (e) {
                console.error('Failed to update endorsement in storage:', e);
            }
            return next;
        });
    };

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
                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            {showEndorse && endorsed && (
                                <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="ph-fill ph-seal-check" /> +5% Institutional Confidence Boost Active
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-outline" onClick={onClose}>Close</button>
                            {showEndorse && (
                                <button
                                    className={endorsed ? 'btn bg-success' : 'btn btn-primary'}
                                    style={endorsed ? { color: 'white', border: 'none' } : undefined}
                                    onClick={handleToggleEndorse}
                                    title={endorsed ? 'Remove institutional endorsement' : 'Endorse student (+5% verified skill confidence boost)'}
                                >
                                    {endorsed
                                        ? <><i className="ph-fill ph-check-circle" /> Endorsed (+5% Boost)</>
                                        : <><i className="ph ph-thumbs-up" /> Endorse for Placement</>}
                                </button>
                            )}
                        </div>
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

    const student = portfolio.student || {};
    const verified_skills = portfolio.verified_skills || [];
    const top_skills = portfolio.top_skills || [];
    const certifications = portfolio.certifications || [];
    const projects = portfolio.projects || [];
    const allSkills = portfolio.skills || top_skills || verified_skills || [];
    const skill_gaps = portfolio.skill_gaps || [];
    const hasResume = Boolean(portfolio.has_resume || student.has_resume || student.portfolio_url);
    const hasAnySkills = allSkills.length > 0;

    return (
        <Shell title="Verified Digital Student Portfolio" showEndorse>
            {/* ── Student header ── */}
            <div className="academician-lead-card mb-24">
                <div
                    className="avatar-2xl bg-blue-light text-blue font-bold"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}
                >
                    {student.initials || (student.full_name ? student.full_name.charAt(0) : 'S')}
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0 }}>{student.full_name || 'Student Profile'}</h4>
                        {endorsed && (
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#065F46',
                                    backgroundColor: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}
                            >
                                <i className="ph-fill ph-seal-check" style={{ color: '#10B981' }} /> Endorsed (+5%)
                            </span>
                        )}
                        {!hasResume && !hasAnySkills && (
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#B45309',
                                    backgroundColor: '#FEF3C7',
                                    border: '1px solid #FDE68A',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                }}
                            >
                                Resume / Skills: Not Uploaded
                            </span>
                        )}
                        {hasResume && (
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#1D4ED8',
                                    backgroundColor: '#EFF6FF',
                                    border: '1px solid #BFDBFE',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                }}
                            >
                                Resume: {student.resume_filename || 'Uploaded & Indexed'}
                            </span>
                        )}
                    </div>
                    <p className="designation" style={{ margin: '4px 0 0 0' }}>{student.domain || 'Domain not set'}</p>
                    {student.email && (
                        <p className="affiliation" style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
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
            <h4 className="font-bold mb-8" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>1. Verified Technical Skills</span>
                {endorsed && (
                    <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                        <i className="ph-fill ph-arrow-circle-up" /> +5% Endorsement boost applied
                    </span>
                )}
            </h4>
            <div className="tags mb-16">
                {verified_skills && verified_skills.length > 0 ? (
                    verified_skills.map(sk => {
                        const baseScore = sk.proficiency_score != null ? Math.round(sk.proficiency_score) : 90;
                        const finalScore = Math.min(100, baseScore + (endorsed ? 5 : 0));
                        return (
                            <span className="tag" key={sk.name}>
                                <i className="ph-fill ph-check-circle text-success" /> {sk.name}
                                <span style={{ marginLeft: 4, fontSize: '11px', fontWeight: endorsed ? 700 : 500, color: endorsed ? '#059669' : 'inherit', opacity: 0.85 }}>
                                    ({finalScore}%{endorsed ? ' • +5% Endorsed' : ''})
                                </span>
                            </span>
                        );
                    })
                ) : (
                    <span className="text-muted" style={{ fontSize: '13px' }}>
                        {!hasAnySkills ? 'No skills uploaded or known yet.' : 'No verified skills yet (all uncorroborated).'}
                    </span>
                )}
            </div>

            {/* ── Top Skills (up to 15) ── */}
            <h4 className="font-bold mb-8" style={{ fontSize: '14px' }}>Top Skills (up to 15)</h4>
            <div className="tags mb-16">
                {top_skills && top_skills.length > 0 ? (
                    top_skills.map(sk => {
                        const isVer = Boolean(sk.is_verified);
                        const baseScore = sk.proficiency_score != null ? Math.round(sk.proficiency_score) : (isVer ? 90 : 55);
                        const finalScore = Math.min(100, baseScore + (endorsed && isVer ? 5 : 0));
                        return (
                            <span className="tag" key={sk.name}>
                                <i className={`ph ${isVer ? 'ph-fill ph-check-circle text-success' : 'ph ph-circle'}`} />
                                {sk.name}
                                <span style={{ marginLeft: 4, fontSize: '11px', fontWeight: (endorsed && isVer) ? 700 : 500, color: (endorsed && isVer) ? '#059669' : 'inherit', opacity: 0.85 }}>
                                    ({finalScore}%{(endorsed && isVer) ? ' • +5% Endorsed' : ''})
                                </span>
                            </span>
                        );
                    })
                ) : (
                    <span className="text-muted" style={{ fontSize: '13px' }}>
                        {!hasAnySkills ? 'Not uploaded / known.' : 'No skills available.'}
                    </span>
                )}
            </div>

            {/* ── Skill Gap Analysis & Verification ── */}
            <h4 className="font-bold mb-8" style={{ fontSize: '14px' }}>2. Skill Gap Analysis &amp; Verification</h4>
            {(() => {
                // 1. If student has NO skills and NO resume
                if (!hasAnySkills && !hasResume) {
                    return (
                        <div
                            className="mb-16"
                            style={{
                                padding: '14px 16px',
                                background: '#F8FAFC',
                                border: '1px dashed #CBD5E1',
                                borderRadius: '8px',
                                fontSize: '13px',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <i className="ph ph-file-dashed text-muted" style={{ fontSize: '18px' }} />
                                <strong style={{ color: '#475569' }}>Not Uploaded / Known</strong>
                            </div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                                No resume or skill profile has been uploaded yet for this student. Awaiting initial onboarding submission.
                            </p>
                        </div>
                    );
                }

                const unverified = allSkills.filter(s => !(s.is_verified || s.isVerified));

                return (
                    <div className="mb-16" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Real database skill gaps from opportunities */}
                        {skill_gaps.length > 0 && (
                            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 14px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <i className="ph-fill ph-chart-line-up" style={{ color: '#4F46E5' }} />
                                    Industry Opportunity Skill Gaps (from Database)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {skill_gaps.slice(0, 3).map((gapItem, idx) => (
                                        <div
                                            key={gapItem.posting_id || idx}
                                            style={{
                                                padding: '8px 12px',
                                                background: '#FFFFFF',
                                                border: '1px solid #CBD5E1',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '12.5px', color: '#0F172A' }}>
                                                    {gapItem.title} <span style={{ fontWeight: 400, color: '#64748B', fontSize: '11px' }}>• {gapItem.company}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, alignItems: 'center' }}>
                                                    <span style={{ fontSize: '11px', color: '#B91C1C', fontWeight: 600 }}>Gaps:</span>
                                                    {(gapItem.missing_skills || []).map((ms, mi) => (
                                                        <span
                                                            key={mi}
                                                            style={{
                                                                fontSize: '11px',
                                                                background: '#FEE2E2',
                                                                color: '#991B1B',
                                                                padding: '1px 6px',
                                                                borderRadius: '4px',
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {typeof ms === 'string' ? ms : (ms.skill || ms.skill_name || ms.name || ms)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', minWidth: '55px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 800, color: gapItem.match_score >= 60 ? '#16A34A' : '#D97706' }}>
                                                    {Math.round(gapItem.match_score)}%
                                                </span>
                                                <div style={{ fontSize: '10px', color: '#64748B' }}>Match</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Uncorroborated resume claims */}
                        {unverified.length > 0 ? (
                            <div
                                style={{
                                    padding: '12px 14px',
                                    background: '#FFFBEB',
                                    border: '1px solid #FDE68A',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <i className="ph-fill ph-warning-circle text-warning" />
                                    <strong style={{ color: '#92400E' }}>
                                        {unverified.length} Uncorroborated {unverified.length === 1 ? 'Claim' : 'Claims'} (Resume Extracted)
                                    </strong>
                                </div>
                                <p style={{ margin: 0, fontSize: '12px', color: '#B45309' }}>
                                    Awaiting supporting certificate evidence: {unverified.map(s => s.name || s.skill_name || s).join(', ')}.
                                </p>
                            </div>
                        ) : hasAnySkills ? (
                            <div
                                style={{
                                    padding: '10px 14px',
                                    background: '#F0FDF4',
                                    border: '1px solid #BBF7D0',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="ph-fill ph-check-circle text-success" />
                                    <strong style={{ color: '#166534' }}>All skills verified and corroborated with evidence.</strong>
                                </div>
                            </div>
                        ) : null}
                    </div>
                );
            })()}

            {/* ── Certifications ── */}
            <h4 className="font-bold mb-8" style={{ fontSize: '14px' }}>3. Industry Certifications</h4>
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
            <h4 className="font-bold mb-8" style={{ fontSize: '14px' }}>4. Projects</h4>
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
