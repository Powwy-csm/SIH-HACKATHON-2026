import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  fetchStudentSkills,
  getCachedStudentSkills,
  calculateClaimConfidence,
} from '../../utils/studentSkills';
import {
  getSavedResumesList,
  saveResumesList,
  getSavedDocumentsList,
  saveDocumentsList,
} from '../../utils/resumeSkillsStorage';
import OpportunitySkillGapCard from '../../components/student/OpportunitySkillGapCard';

import { supabase } from '../../lib/supabase';
import { getAccessToken, clearStaleSession } from '../../services/apiClient';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export default function StudentDashboard() {
  const { user, accessToken: authContextToken, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [skills, setSkills] = useState(() => getCachedStudentSkills(user?.id));
  const [matches, setMatches] = useState([]);
  const [resumes, setResumes] = useState(() => getSavedResumesList(user?.id));
  const [documents, setDocuments] = useState(() => getSavedDocumentsList(user?.id));
  const [opportunities, setOpportunities] = useState([]);
  const [dashboardDataLoaded, setDashboardDataLoaded] = useState(false);
  const lastReqTimeRef = useRef(0);

  const apiFetch = useCallback(async (path, timeoutMs = 15000, options = {}) => {
    let accessToken = authContextToken || (await getAccessToken());
    if (!accessToken) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });

      if (response.status === 401 && supabase) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData?.session?.access_token) {
            accessToken = refreshData.session.access_token;
            response = await fetch(`${API_BASE_URL}${path}`, {
              ...options,
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                ...(options.headers || {}),
              },
              signal: controller.signal,
            });
          } else {
            await clearStaleSession();
          }
        } catch {
          await clearStaleSession();
        }
      }

      clearTimeout(timer);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      clearTimeout(timer);
      return null;
    }
  }, [authContextToken]);

  useEffect(() => {
    if (authLoading || !user?.id) return;

    let mounted = true;
    const reqId = Date.now();
    lastReqTimeRef.current = reqId;

    const loadDashboardData = async () => {
      try {
        const [listRes, docsRes, studentSkills, oppsRes] = await Promise.all([
          apiFetch('/api/resume/list', 15000),
          apiFetch('/api/resume/documents', 15000),
          fetchStudentSkills(user?.id),
          apiFetch('/api/student/opportunities', 15000),
        ]);

        if (!mounted || reqId !== lastReqTimeRef.current) return;

        if (listRes) {
          const rList = Array.isArray(listRes) ? listRes : (listRes.data || []);
          setResumes(rList);
          saveResumesList(user?.id, rList);
        }
        if (docsRes) {
          const dList = Array.isArray(docsRes) ? docsRes : (docsRes.documents || []);
          setDocuments(dList);
          saveDocumentsList(user?.id, dList);
        }

        setSkills(studentSkills || []);

        if (oppsRes && Array.isArray(oppsRes)) {
          setOpportunities(oppsRes);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        if (mounted && reqId === lastReqTimeRef.current) {
          setDashboardDataLoaded(true);
        }
      }
    };

    loadDashboardData();

    return () => {
      mounted = false;
    };
  }, [authLoading, apiFetch, user?.id]);

  const studentName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'Student');

  const hasResume = resumes.length > 0 || Boolean(status?.resume_id);
  const hasSkills = skills.length > 0;
  const verifiedCount = skills.filter(s => s.isVerified).length;
  const strongSkills = skills.filter(skill => skill.confidence >= 70);
  const developingSkills = skills.filter(skill => skill.confidence >= 40 && skill.confidence < 70);
  const attentionSkills = skills.filter(skill => skill.confidence < 40);
  const topStrength = skills.reduce((top, skill) => !top || skill.confidence > top.confidence ? skill : top, null);
  const focusSkill = skills.reduce((lowest, skill) => !lowest || skill.confidence < lowest.confidence ? skill : lowest, null);

  // Calculate real profile completion
  const profileCompletion = Math.min(
    100,
    25 + (hasResume ? 25 : 0) + (hasSkills ? 25 : 0) + (verifiedCount > 0 ? 25 : 0)
  );

  const readinessScore = hasSkills ? Math.min(95, Math.round((verifiedCount / Math.max(skills.length, 1)) * 50 + 45)) : 20;

  if (authLoading) {
    return (
      <main className="view-section active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16 }}>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }}></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading session...</p>
      </main>
    );
  }

  return (
    <main className="view-section active">
      <header className="page-header">
        <div className="header-text">
          <h1>Welcome, {studentName}</h1>
          <p>
            {hasResume
              ? "You're making solid progress. Here is what deserves your attention today."
              : "Welcome to BridgeX! Start by exploring your skill profile and discovering opportunities."}
          </p>
        </div>
        <Link className="btn btn-primary" to="/student/resume">
          <i className="ph ph-file-text"></i>
          Resume Intelligence
        </Link>
      </header>

      {/* Onboarding Guide for New Users */}
      {dashboardDataLoaded &&
        !user?.onboarding_completed &&
        !hasResume &&
        !hasSkills && (
        <section className="progress-section" style={{ border: '1px solid #BFDBFE', background: '#EFF6FF', borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ background: '#3B82F6', color: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              GET STARTED
            </span>
            <h2 style={{ margin: 0, fontSize: 18, color: '#1E3A8A' }}>Welcome to your BridgeX Career Hub</h2>
          </div>
          <p style={{ color: '#1E40AF', fontSize: 14, lineHeight: 1.6, maxWidth: 700, margin: '0 0 20px 0' }}>
            BridgeX extracts and verifies your real technical skills directly from your resume and credentials, matching you with relevant industry internships without bias.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>1</span>
                <strong style={{ fontSize: 14 }}>Upload Resume</strong>
              </div>
              <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px 0' }}>Upload your latest PDF resume to automatically extract your skills.</p>
              <Link to="/student/resume" className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}>Upload PDF</Link>
            </div>

            <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#E2E8F0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>2</span>
                <strong style={{ fontSize: 14 }}>Corroborate Skills</strong>
              </div>
              <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px 0' }}>Upload certificates or project proof to earn verified skill badges.</p>
              <Link to="/student/resume" className="btn btn-outline" style={{ fontSize: 12, padding: '6px 12px' }}>Verify Proof</Link>
            </div>

            <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#E2E8F0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>3</span>
                <strong style={{ fontSize: 14 }}>AI Opportunities</strong>
              </div>
              <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px 0' }}>Discover tailored internships scored against your verified skill profile.</p>
              <Link to="/student/opportunities" className="btn btn-outline" style={{ fontSize: 12, padding: '6px 12px' }}>Browse All</Link>
            </div>
          </div>
        </section>
      )}

      {/* Real Career Progress Metrics */}
      <section className="progress-section">
        <div className="progress-header">
          <h2>Your Career Progress</h2>
          <p className="encouragement">
            <i className="ph-fill ph-sparkle text-blue"></i>
            {hasResume
              ? `You have ${skills.length} extracted skills (${verifiedCount} verified with documentary evidence).`
              : "Upload your resume in Resume Intelligence to automatically compute your readiness metrics."}
          </p>
        </div>

        <div className="metrics-grid">
          <div className="metric-block">
            <span className="metric-label">Profile Completion</span>
            <span className="metric-value">{profileCompletion}%</span>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${profileCompletion}%` }}></div>
            </div>
          </div>

          <div className="metric-block">
            <span className="metric-label">Industry Readiness</span>
            <span className="metric-value">{readinessScore}%</span>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${readinessScore}%` }}></div>
            </div>
          </div>

          <div className="metric-block">
            <span className="metric-label">Verified Skills</span>
            <span className="metric-value">{verifiedCount} / {skills.length}</span>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${skills.length > 0 ? (verifiedCount / skills.length) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div className="metric-block">
            <span className="metric-label">Opportunity Matches</span>
            <span className="metric-value">{matches.length}</span>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.min(100, matches.length * 20)}%` }}></div>
            </div>
          </div>
        </div>
      </section>

      <section className="portal-card spaced-section" style={{ padding: 20 }}>
        <div className="section-heading" style={{ marginBottom: 16 }}>
          <h2>YOUR SKILL READINESS</h2>
          <p className="section-sub">Based on your persisted student skill profile.</p>
        </div>

        {skills.length === 0 ? (
          <div className="empty-state" style={{ padding: 20, textAlign: 'center', background: '#F8FAFC', borderRadius: 8 }}>
            <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
              No skills tracked yet. Complete your skill profile to see your readiness.
            </p>
          </div>
        ) : (
          <>
            <div className="metrics-grid" style={{ marginBottom: 16 }}>
              <div className="metric-block">
                <span className="metric-label">Skills tracked</span>
                <span className="metric-value">{skills.length}</span>
              </div>
              <div className="metric-block">
                <span className="metric-label">Developing</span>
                <span className="metric-value">{developingSkills.length}</span>
              </div>
              <div className="metric-block">
                <span className="metric-label">Strong</span>
                <span className="metric-value">{strongSkills.length}</span>
              </div>
              <div className="metric-block">
                <span className="metric-label">Needs attention</span>
                <span className="metric-value">{attentionSkills.length}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div style={{ background: '#F8FAFC', borderRadius: 8, padding: 12 }}>
                <span className="metric-label">Top strength</span>
                <strong style={{ display: 'block', marginTop: 4 }}>
                  {topStrength?.name} · {topStrength?.confidence}%
                </strong>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: 8, padding: 12 }}>
                <span className="metric-label">Focus area</span>
                <strong style={{ display: 'block', marginTop: 4 }}>
                  {focusSkill?.name} · {focusSkill?.confidence}%
                </strong>
              </div>
            </div>
            <Link className="btn btn-text" to="/student/opportunities" style={{ marginTop: 12 }}>
              Explore Opportunities & Demand <i className="ph ph-arrow-right"></i>
            </Link>
          </>
        )}
      </section>

      {/* Dynamic Live Opportunity Skill Gap */}
      <OpportunitySkillGapCard
        postings={opportunities}
        studentSkills={skills}
        loading={!dashboardDataLoaded}
      />

      {/* Recommended Opportunities */}
      <section className="spaced-section">
        <div className="section-heading">
          <h2>Recommended for You</h2>
          <p className="section-sub">Opportunities matched against your verified skills and resume profile.</p>
        </div>

        {matches.length > 0 ? (
          <div className="recommendation-grid">
            {matches.map(item => (
              <article className="opp-card" key={item.posting_id}>
                <div className="opp-header">
                  <span className="match-badge">{Math.round((item.match_score || 0) * 100)}% Match</span>
                  <button className="bookmark-btn" type="button" aria-label={`Save ${item.title}`}>
                    <i className="ph ph-bookmark-simple"></i>
                  </button>
                </div>
                <h3 className="opp-title">{item.title}</h3>
                <p className="opp-company">{item.company}</p>

                <div className="opp-tags">
                  {(item.matched_skills || []).slice(0, 4).map(skill => (
                    <span key={skill.skill_name || skill.name} className="tag-matched">
                      ✓ {skill.skill_name || skill.name}
                    </span>
                  ))}
                  {(item.missing_skills || []).slice(0, 2).map(skill => (
                    <span key={skill.skill_name || skill.name} className="tag-missing" style={{ background: '#FEF3C7', color: '#92400E' }}>
                      + {skill.skill_name || skill.name}
                    </span>
                  ))}
                </div>

                <div className="opp-footer">
                  <span className="opp-detail">
                    <i className="ph ph-briefcase"></i> {item.type || 'Internship'}
                  </span>
                  <span className="opp-detail">
                    <i className="ph ph-map-pin"></i> {item.location || 'Remote'}
                  </span>
                </div>

                <Link className="btn btn-outline w-full mt-24" to="/student/opportunities">
                  View Opportunity Details
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '36px 20px', background: '#F8FAFC', borderRadius: 12, border: '1px dashed #CBD5E1', textAlign: 'center' }}>
            <i className="ph ph-briefcase" style={{ fontSize: 36, color: '#94A3B8', marginBottom: 12, display: 'inline-block' }}></i>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 16 }}>No matched opportunities yet</h3>
            <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 16px 0' }}>
              {hasResume
                ? "Our matching engine is calculating new matches. Try corroborating your skills with certificates."
                : "Upload your resume in Resume Intelligence to automatically generate tailored internship matches."}
            </p>
            <Link className="btn btn-outline" to="/student/resume">
              Go to Resume Intelligence
            </Link>
          </div>
        )}
      </section>

      {/* Skills and Insights Grid */}
      <section className="two-col-section">
        <div className="skills-column">
          <div className="section-heading">
            <h2>Your Skills Profile</h2>
            <p className="section-sub">Skills extracted from your active resume and corroborating credentials.</p>
          </div>

          {skills.length > 0 ? (
            <div className="clean-skill-list">
              {skills.slice(0, 8).map(skill => {
                const score = calculateClaimConfidence(skill);
                const isVerified = Boolean(skill.is_verified || skill.isVerified || skill.status === 'verified' || score >= 90);
                return (
                  <div className="skill-row" key={skill.skill_id || skill.skill_name || skill.name}>
                    <div className="skill-info">
                      <span>
                        {skill.skill_name || skill.name || skill.raw_skill_name}
                        {isVerified && (
                          <span style={{ marginLeft: 6, color: '#059669', fontSize: 12 }}>
                            <i className="ph-fill ph-check-circle"></i> Verified
                          </span>
                        )}
                      </span>
                      <span className="skill-pct">{score}%</span>
                    </div>
                    <div className="progress-track">
                      <div className={`progress-fill ${isVerified ? 'bg-success' : ''}`} style={{ width: `${score}%` }}></div>
                    </div>
                  </div>
                );
              })}
              {skills.length > 8 && (
                <Link to="/student/resume" className="btn btn-text" style={{ marginTop: 12 }}>
                  View all {skills.length} skills in Resume Intelligence <i className="ph ph-arrow-right"></i>
                </Link>
              )}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '36px 20px', background: '#F8FAFC', borderRadius: 12, border: '1px dashed #CBD5E1', textAlign: 'center' }}>
              <i className="ph ph-target" style={{ fontSize: 36, color: '#94A3B8', marginBottom: 12, display: 'inline-block' }}></i>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 16 }}>No skills detected yet</h3>
              <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 16px 0' }}>Upload your resume to extract skills with Google Gemini AI.</p>
              <Link className="btn btn-primary" to="/student/resume">Upload Resume</Link>
            </div>
          )}
        </div>

        <div className="gap-column">
          <div className="section-heading">
            <h2>Career Recommendation</h2>
            <p className="section-sub">Personalized next action to improve employability.</p>
          </div>

          <div className="insight-card">
            {skills.some(s => !(s.is_verified || s.isVerified || s.status === 'verified')) ? (
              <>
                <div className="insight-header">
                  <h3>Corroborate Unverified Skills</h3>
                  <span className="insight-label"><i className="ph-fill ph-sparkle"></i> AI Insight</span>
                </div>
                <p className="insight-text">
                  You have {skills.length - verifiedCount} unverified skills extracted from your resume. Uploading certificates or project links corroborates your claims and boosts your match ranking with employers by up to 40%.
                </p>
                <div className="insight-actions">
                  <Link className="btn btn-primary" to="/student/resume">Corroborate Skills</Link>
                  <Link className="btn btn-text" to="/student/opportunities">Browse Opportunities</Link>
                </div>
              </>
            ) : hasResume ? (
              <>
                <div className="insight-header">
                  <h3>Profile Fully Verified</h3>
                  <span className="insight-label"><i className="ph-fill ph-check-circle"></i> Complete</span>
                </div>
                <p className="insight-text">
                  Great job! Your extracted skills are corroborated. Check out your recommended opportunities to apply directly to matched roles.
                </p>
                <div className="insight-actions">
                  <Link className="btn btn-primary" to="/student/opportunities">Explore Opportunities</Link>
                </div>
              </>
            ) : (
              <>
                <div className="insight-header">
                  <h3>Resume Required</h3>
                  <span className="insight-label"><i className="ph-fill ph-sparkle"></i> Action Needed</span>
                </div>
                <p className="insight-text">
                  Your skill profile is waiting to be unlocked. Upload your resume to extract your technical skills and generate AI-driven opportunity matches.
                </p>
                <div className="insight-actions">
                  <Link className="btn btn-primary" to="/student/resume">Upload Resume Now</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Real Portfolio Preview & Summary */}
      <section className="two-col-section mb-64">
        <div>
          <div className="section-heading">
            <h2>Your Applications</h2>
          </div>
          <div className="empty-state" style={{ padding: '28px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', textAlign: 'center' }}>
            <i className="ph ph-paper-plane-tilt" style={{ fontSize: 32, color: '#94A3B8', marginBottom: 8, display: 'inline-block' }}></i>
            <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 12px 0' }}>No submitted applications yet. Find matching internships and apply with your verified profile.</p>
            <Link className="btn btn-outline" to="/student/opportunities">Discover Opportunities</Link>
          </div>
        </div>

        <div>
          <div className="section-heading">
            <h2>Your Portfolio Preview</h2>
          </div>
          <div className="portfolio-preview-card">
            <div className="pp-stats">
              <div className="pp-stat"><span>Resumes</span><strong>{resumes.length}</strong></div>
              <div className="pp-stat"><span>Credentials</span><strong>{documents.length}</strong></div>
              <div className="pp-stat"><span>Skills</span><strong>{skills.length}</strong></div>
              <div className="pp-stat"><span>Verified</span><strong>{verifiedCount}</strong></div>
            </div>
            <div className="pp-actions">
              <Link className="btn btn-outline" to="/student/portfolio">View Portfolio</Link>
              <Link className="btn btn-text" to="/student/profile">View Profile</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
