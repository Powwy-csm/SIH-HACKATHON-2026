import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { computeOpportunitySkillGap } from '../../utils/skillGapAnalysis';

/**
 * OpportunitySkillGapCard
 *
 * Renders dynamic, real-time skill gap analysis based on live opportunity postings
 * compared with the student's real skills profile.
 *
 * Props:
 *  - postings: Array of posting objects (from /api/student/opportunities)
 *  - studentSkills: Array of student skill objects (from fetchStudentSkills)
 *  - loading: boolean
 *  - compact: boolean (optional, for dashboard side-column vs full width)
 */
export default function OpportunitySkillGapCard({ postings = [], studentSkills = [], loading = false, compact = false }) {
  const analysis = useMemo(() => {
    return computeOpportunitySkillGap(postings, studentSkills);
  }, [postings, studentSkills]);

  if (loading) {
    return (
      <section className="portal-card spaced-section" style={{ padding: 20 }}>
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748B' }}>
          <i className="ph ph-circle-notch" style={{ fontSize: 24, display: 'inline-block', marginBottom: 8, animation: 'spin 1s linear infinite' }}></i>
          <p style={{ margin: 0, fontSize: 13 }}>Analyzing live opportunity skill demand…</p>
        </div>
      </section>
    );
  }

  // 1. Edge Case: No opportunities in the system
  if (analysis.status === 'no_opportunities') {
    return (
      <section className="portal-card spaced-section" style={{ padding: 24, border: '1px dashed #CBD5E1', background: '#F8FAFC' }}>
        <div className="section-heading" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.04em', color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ph ph-chart-line-up" style={{ color: '#2563EB' }}></i>
            YOUR SKILL GAP
          </h2>
        </div>
        <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
          {analysis.message}
        </p>
      </section>
    );
  }

  // 2. Edge Case: No skill requirements specified in available opportunities
  if (analysis.status === 'no_skills_required') {
    return (
      <section className="portal-card spaced-section" style={{ padding: 24, border: '1px dashed #CBD5E1', background: '#F8FAFC' }}>
        <div className="section-heading" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.04em', color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ph ph-chart-line-up" style={{ color: '#2563EB' }}></i>
            YOUR SKILL GAP
          </h2>
        </div>
        <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
          {analysis.message}
        </p>
      </section>
    );
  }

  // 3. Edge Case: Student already matches all demanded skills
  if (analysis.status === 'all_matched') {
    return (
      <section className="portal-card spaced-section" style={{ padding: 24, border: '1px solid #86EFAC', background: '#F0FDF4' }}>
        <div className="section-heading" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.04em', color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ph-fill ph-check-circle" style={{ color: '#16A34A' }}></i>
            YOUR SKILL GAP
          </h2>
          <p className="section-sub" style={{ color: '#15803D' }}>
            Calculated dynamically across {analysis.totalOpportunities} active industry {analysis.totalOpportunities === 1 ? 'opportunity' : 'opportunities'}.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#FFFFFF', borderRadius: 10, border: '1px solid #BBF7D0', marginBottom: 16 }}>
          <i className="ph-fill ph-sparkle" style={{ fontSize: 24, color: '#16A34A' }}></i>
          <div>
            <strong style={{ color: '#166534', fontSize: 14, display: 'block' }}>Complete Skill Match</strong>
            <span style={{ fontSize: 13, color: '#15803D' }}>{analysis.message}</span>
          </div>
        </div>

        {analysis.matchedSkills.length > 0 && (
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>
              Skills you match:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {analysis.matchedSkills.map(sk => (
                <span
                  key={sk.normalizedName}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: '#DCFCE7',
                    color: '#166534',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <i className="ph-fill ph-check-circle"></i> {sk.name}
                  <span style={{ opacity: 0.75, fontSize: 11 }}>({sk.count} {sk.count === 1 ? 'opp' : 'opps'})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  // 4. Standard Case: Student has skill gaps relative to current opportunities
  const { mostDemandedMissingSkill, missingSkills, matchedSkills, totalOpportunities } = analysis;

  return (
    <section className="portal-card spaced-section" style={{ padding: 24, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
      <div className="section-heading" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.04em', color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <i className="ph-fill ph-chart-line-up" style={{ color: '#2563EB' }}></i>
            YOUR SKILL GAP
          </h2>
          <span style={{ fontSize: 12, color: '#64748B', background: '#F1F5F9', padding: '3px 10px', borderRadius: 12, fontWeight: 500 }}>
            Live Market Demand
          </span>
        </div>
        <p className="section-sub" style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
          Calculated dynamically from {totalOpportunities} active industry {totalOpportunities === 1 ? 'opportunity' : 'opportunities'}.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 18 }}>
        {/* Most Demanding Skill Required */}
        {mostDemandedMissingSkill && (
          <div
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
              border: '1px solid #BFDBFE',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }}></span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Most Demanding Skill Required
                </span>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 20, fontWeight: 700, color: '#1E3A8A' }}>
                {mostDemandedMissingSkill.name}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#1E40AF', lineHeight: 1.4 }}>
                Required by <strong>{mostDemandedMissingSkill.count}</strong> of {totalOpportunities} current {totalOpportunities === 1 ? 'opportunity' : 'opportunities'} ({mostDemandedMissingSkill.percentage}% market demand).
              </p>
            </div>

            <div style={{ marginTop: 14 }}>
              <Link
                to="/student/resume"
                className="btn btn-primary"
                style={{ fontSize: 12, padding: '6px 14px', width: 'fit-content' }}
              >
                <i className="ph ph-plus-circle"></i> Add / Corroborate Skill
              </Link>
            </div>
          </div>
        )}

        {/* Missing Skills Summary List */}
        <div style={{ padding: '16px 18px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <i className="ph-fill ph-warning-circle" style={{ color: '#D97706', fontSize: 16 }}></i>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Skills You're Missing ({missingSkills.length})
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
            {missingSkills.map(sk => (
              <span
                key={sk.normalizedName}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  color: '#92400E',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span style={{ color: '#B45309' }}>•</span> {sk.name}
                <span style={{ fontSize: 11, opacity: 0.75 }}>({sk.count} {sk.count === 1 ? 'opp' : 'opps'})</span>
              </span>
            ))}
          </div>

          {studentSkills.length === 0 && (
            <p style={{ margin: '10px 0 0 0', fontSize: 12, color: '#64748B' }}>
              Upload your resume in Resume Intelligence to populate your skills profile.
            </p>
          )}
        </div>
      </div>

      {/* Matched Skills Overview */}
      {matchedSkills.length > 0 && (
        <div style={{ paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <i className="ph-fill ph-check-circle" style={{ color: '#16A34A', fontSize: 16 }}></i>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Skills You Already Have in Demand ({matchedSkills.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {matchedSkills.map(sk => (
              <span
                key={sk.normalizedName}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: '#DCFCE7',
                  border: '1px solid #BBF7D0',
                  color: '#166534',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <i className="ph-fill ph-check-circle" style={{ fontSize: 12 }}></i> {sk.name}
                <span style={{ fontSize: 11, opacity: 0.75 }}>({sk.count} {sk.count === 1 ? 'opp' : 'opps'})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
