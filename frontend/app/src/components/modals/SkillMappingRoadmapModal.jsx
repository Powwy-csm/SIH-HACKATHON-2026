import React, { useEffect, useMemo } from 'react';
import { calculateOpportunityMatch } from '../../utils/skillGapAnalysis';

/**
 * SkillMappingRoadmapModal
 *
 * Provides real, defensible skill mapping and a prioritized learning roadmap
 * for a specific opportunity based on the student's authentic verified profile skills.
 *
 * Props:
 *   posting        {Object}   — Opportunity item (title, company, skills_list, etc.)
 *   studentSkills  {Array}    — Array of student skill objects from database
 *   onClose        {Function} — Modal close callback
 *   onApply        {Function} — Optional apply callback
 *   isApplied      {Boolean}  — Whether the student has already applied
 *   isApplying     {Boolean}  — Apply in progress state
 */
export default function SkillMappingRoadmapModal({
  posting,
  studentSkills = [],
  onClose,
  onApply,
  isApplied = false,
  isApplying = false,
}) {
  // Keyboard accessibility: Escape key closes modal & lock body scroll
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

  const matchData = useMemo(() => {
    if (!posting) return null;
    return calculateOpportunityMatch(posting, studentSkills);
  }, [posting, studentSkills]);

  if (!posting || !matchData) return null;

  const companyName = posting.company_name || posting.companies?.name || 'Partner Employer';
  const roleTitle = posting.title || 'Opportunity';
  const { matchPercentage, matchedSkills, missingSkills, totalRequired, isGeneral } = matchData;

  // Determine alignment tier
  let readinessBadge = { text: 'Evaluating', bg: '#F1F5F9', color: '#64748B' };
  if (isGeneral) {
    readinessBadge = { text: 'General Alignment', bg: '#EFF6FF', color: '#2563EB' };
  } else if (matchPercentage >= 75) {
    readinessBadge = { text: 'High Alignment', bg: '#DCFCE7', color: '#15803D' };
  } else if (matchPercentage >= 40) {
    readinessBadge = { text: 'Moderate Skill Gap', bg: '#FEF3C7', color: '#B45309' };
  } else {
    readinessBadge = { text: 'Foundational Gap', bg: '#FEE2E2', color: '#B91C1C' };
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#4F46E5',
                  backgroundColor: '#EEF2FF',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                <i className="ph-fill ph-sparkle" style={{ marginRight: '4px' }} />
                AI Skill Mapping &amp; Roadmap
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: readinessBadge.bg,
                  color: readinessBadge.color,
                }}
              >
                {readinessBadge.text}
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {roleTitle}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              {companyName} • {posting.type ? posting.type.toUpperCase() : 'INTERNSHIP'} • {posting.location || posting.mode || 'On-site'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              fontSize: '22px',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
            }}
          >
            <i className="ph ph-x" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Match Overview Bar */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Profile Match Readiness
              </span>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>
                {matchPercentage !== null ? `${matchPercentage}% Match` : 'General Fit'}
              </div>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {totalRequired > 0
                  ? `${matchedSkills.length} of ${totalRequired} required skills currently matched in profile`
                  : 'Open opportunity with general technical requirements'}
              </span>
            </div>
            {matchPercentage !== null && (
              <div style={{ width: '120px', textAlign: 'right' }}>
                <div
                  style={{
                    height: '10px',
                    backgroundColor: '#E2E8F0',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    marginBottom: '4px',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${matchPercentage}%`,
                      backgroundColor: matchPercentage >= 75 ? '#10B981' : matchPercentage >= 40 ? '#F59E0B' : '#EF4444',
                      borderRadius: '999px',
                    }}
                  />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                  {matchPercentage}% Competency Overlap
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Two-Column Skill Mapping Matrix */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
              Skill Mapping Matrix
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Column A: Matched Competencies */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <i className="ph-fill ph-check-circle" style={{ color: '#16A34A', fontSize: '16px' }} />
                  <strong style={{ fontSize: '13px', color: '#166534' }}>
                    Matched Competencies ({matchedSkills.length})
                  </strong>
                </div>
                {matchedSkills.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {matchedSkills.map((sk) => (
                      <span
                        key={sk}
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #86EFAC',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <i className="ph ph-check" style={{ fontSize: '11px' }} />
                        {sk}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '12px', color: '#15803D', fontStyle: 'italic' }}>
                    No direct skill overlap in verified skills yet.
                  </p>
                )}
              </div>

              {/* Column B: Skill Gaps */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <i className="ph-fill ph-warning-circle" style={{ color: '#D97706', fontSize: '16px' }} />
                  <strong style={{ fontSize: '13px', color: '#92400E' }}>
                    Identified Skill Gaps ({missingSkills.length})
                  </strong>
                </div>
                {missingSkills.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {missingSkills.map((sk, idx) => (
                      <span
                        key={sk}
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #FCD34D',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title={idx === 0 ? 'High Priority Gap' : 'Targeted Gap'}
                      >
                        <i className="ph ph-trend-up" style={{ fontSize: '11px' }} />
                        {sk}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '12px', color: '#92400E', fontStyle: 'italic' }}>
                    All required skills met! Zero gap for this role.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Prioritized Career Learning Roadmap */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
              Actionable Learning Roadmap
            </h4>
            {missingSkills.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Milestone 1 */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#EEF2FF',
                      color: '#4F46E5',
                      fontWeight: 800,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    1
                  </span>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#0F172A', display: 'block' }}>
                      Phase 1 (Priority Milestone): Master {missingSkills[0]} Fundamentals
                    </strong>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      Focus on core architecture, common libraries, and industry workflows for <strong>{missingSkills[0]}</strong> to cover the primary role requirement.
                    </span>
                  </div>
                </div>

                {/* Milestone 2 */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#EEF2FF',
                      color: '#4F46E5',
                      fontWeight: 800,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    2
                  </span>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#0F172A', display: 'block' }}>
                      Phase 2 (Project Integration): Build a Functional Showcase
                    </strong>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      {missingSkills.length > 1
                        ? `Build an end-to-end project demonstrating ${missingSkills[1]} alongside your verified strength in ${matchedSkills[0] || 'core software engineering'}.`
                        : `Deploy a production-grade portfolio project demonstrating ${missingSkills[0]} implementation.`}
                    </span>
                  </div>
                </div>

                {/* Milestone 3 */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#EEF2FF',
                      color: '#4F46E5',
                      fontWeight: 800,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    3
                  </span>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#0F172A', display: 'block' }}>
                      Phase 3 (Verification &amp; Shortlist Readiness)
                    </strong>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      Complete an assessment verification on BridgeX to turn your estimated skill into an institution/AI-verified badge and increase shortlist probability to 100%.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <i className="ph-fill ph-check-circle" style={{ color: '#16A34A', fontSize: '22px' }} />
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#166534', display: 'block' }}>
                    Full Skill Alignment Achieved
                  </strong>
                  <span style={{ fontSize: '12.5px', color: '#15803D' }}>
                    You already possess all required skills for this position. Tailor your resume to highlight your projects in {matchedSkills.join(', ')} and apply now.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: AI Strategic Fit & Career Suggestions */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <i className="ph-fill ph-lightbulb" style={{ color: '#F59E0B', fontSize: '20px', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.5' }}>
              <strong style={{ color: '#0F172A', display: 'block', marginBottom: '2px' }}>
                AI Recommendation for {roleTitle}:
              </strong>
              {missingSkills.length > 0 ? (
                <>
                  Your verified competency in <strong>{matchedSkills.slice(0, 2).join(' & ') || 'your profile domain'}</strong> provides a viable base.
                  Employers hiring for this position at <strong>{companyName}</strong> specifically test for <strong>{missingSkills.slice(0, 2).join(' & ')}</strong>.
                  Highlight relevant projects in your application cover letter to stand out in recruiter screening.
                </>
              ) : (
                <>
                  Your profile is highly competitive for this role at <strong>{companyName}</strong>. Emphasize your verified competencies in your cover letter and submit your application.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            Close
          </button>
          {onApply && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={isApplied || isApplying}
              onClick={() => onApply(posting.id)}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isApplied ? (
                <>
                  <i className="ph-fill ph-check-circle" style={{ color: '#10B981' }} /> Applied
                </>
              ) : isApplying ? (
                'Submitting Application…'
              ) : (
                <>
                  <i className="ph ph-paper-plane-tilt" /> Apply for Role
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
