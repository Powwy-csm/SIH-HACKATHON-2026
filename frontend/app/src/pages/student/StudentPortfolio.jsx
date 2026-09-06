import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSavedResumeAnalysis } from '../../utils/resumeSkillsStorage';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

function getAccessToken() {
  const direct = localStorage.getItem('supabase_access_token') || localStorage.getItem('access_token');
  if (direct) return direct;

  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
    try {
      const value = JSON.parse(localStorage.getItem(key));
      const token = value?.access_token || value?.currentSession?.access_token;
      if (token) return token;
    } catch {
      // Ignore
    }
  }
  return null;
}

export default function StudentPortfolio() {
  const { user, accessToken: authContextToken, loading: authLoading } = useAuth();
  const [skills, setSkills] = useState(() => {
    const saved = getSavedResumeAnalysis(user?.id);
    return saved?.skills || [];
  });
  const [documents, setDocuments] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      const saved = getSavedResumeAnalysis(user.id);
      if (saved && Array.isArray(saved.skills) && saved.skills.length > 0) {
        setSkills(saved.skills);
      }
    }
  }, [user?.id]);

  const apiFetch = useCallback(async (path, timeoutMs = 3500) => {
    const accessToken = authContextToken || getAccessToken();
    if (!accessToken) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      clearTimeout(timer);
      return null;
    }
  }, [authContextToken]);

  useEffect(() => {
    if (authLoading) return;

    let mounted = true;
    const loadData = async () => {
      try {
        const saved = getSavedResumeAnalysis(user?.id);
        const [docsRes, listRes] = await Promise.all([
          apiFetch('/api/resume/documents', 3000),
          apiFetch('/api/resume/list', 3000),
        ]);

        if (!mounted) return;

        if (docsRes) setDocuments(Array.isArray(docsRes.documents) ? docsRes.documents : (Array.isArray(docsRes) ? docsRes : []));
        if (listRes) {
          const rList = Array.isArray(listRes) ? listRes : (listRes.data || []);
          setResumes(rList);
        }

        const hasSavedSkills = saved && Array.isArray(saved.skills) && saved.skills.length > 0;
        if (!hasSavedSkills && listRes && listRes.length > 0) {
          const intelRes = await apiFetch('/api/resume/intelligence', 4000);
          if (mounted && intelRes && Array.isArray(intelRes.skills) && intelRes.skills.length > 0) {
            setSkills(intelRes.skills);
            if (user?.id) {
              saveResumeAnalysis(user.id, {
                resumeId: listRes[0]?.resume_id,
                skills: intelRes.skills,
                matches: intelRes.recommendations || [],
              });
            }
          }
        }
      } catch (err) {
        console.error('Error loading portfolio data:', err);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [authLoading, apiFetch, user?.id]);

  const studentName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'Student');
  const verifiedSkills = skills.filter(s => s.is_verified || s.isVerified || s.status === 'verified');

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
          <h1>{studentName}'s Portfolio</h1>
          <p>Your verified projects, certificates, skills, and achievements in one place.</p>
        </div>
        <Link className="btn btn-primary" to="/student/profile">
          <i className="ph ph-user"></i> View Profile
        </Link>
      </header>

      <section className="portfolio-preview-card spaced-section">
        <div className="pp-stats">
          <div className="pp-stat"><span>Resumes</span><strong>{resumes.length}</strong></div>
          <div className="pp-stat"><span>Credentials</span><strong>{documents.length}</strong></div>
          <div className="pp-stat"><span>Skills</span><strong>{skills.length}</strong></div>
          <div className="pp-stat"><span>Verified</span><strong>{verifiedSkills.length}</strong></div>
        </div>
        <p className="p-text">
          {user?.user_metadata?.bio || "This portfolio showcases verified evidence and credentials corroborated through BridgeX automated extraction and document verification."}
        </p>
      </section>

      <div className="profile-layout">
        <section className="p-section">
          <h2>Active Resume & Projects</h2>
          {resumes.length > 0 ? (
            <div className="project-list">
              {resumes.map(r => (
                <article className="project-item portal-card compact-card" key={r.resume_id || r.id}>
                  <h3>{r.file_name}</h3>
                  <span className="p-date">
                    {r.uploaded_at ? new Date(r.uploaded_at).toLocaleDateString() : 'Active Resume'}
                  </span>
                  <p className="p-text">
                    Extracted skills and career history parsed from this document.
                  </p>
                  {r.resume_url && (
                    <div style={{ marginTop: 12 }}>
                      <a href={r.resume_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: 12, padding: '4px 12px' }}>
                        <i className="ph ph-arrow-square-out"></i> Preview Document
                      </a>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 24, textAlign: 'center', background: '#F8FAFC', borderRadius: 8, border: '1px dashed #CBD5E1' }}>
              <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 12px 0' }}>No resumes uploaded yet to showcase.</p>
              <Link to="/student/resume" className="btn btn-outline" style={{ fontSize: 12 }}>Upload Resume</Link>
            </div>
          )}
        </section>

        <aside className="p-section">
          <h2>Skills Profile</h2>
          {skills.length > 0 ? (
            <div className="skill-tags">
              {skills.map(skill => {
                const isVerified = skill.is_verified || skill.isVerified || skill.status === 'verified';
                return (
                  <span className={`s-tag ${isVerified ? 'verified' : ''}`} key={skill.skill_id || skill.skill_name || skill.name}>
                    {skill.skill_name || skill.name || skill.raw_skill_name}
                    {isVerified && <i className="ph-fill ph-check-circle" style={{ marginLeft: 4 }}></i>}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 16, textAlign: 'center', background: '#F8FAFC', borderRadius: 8, border: '1px dashed #CBD5E1' }}>
              <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 8px 0' }}>No skills detected yet.</p>
              <Link to="/student/resume" className="btn btn-outline" style={{ fontSize: 12 }}>Upload Resume</Link>
            </div>
          )}

          <h2 className="mt-24">Verified Certifications</h2>
          {documents.length > 0 ? (
            <ul className="clean-list">
              {documents.map(doc => (
                <li key={doc.document_id || doc.id} style={{ padding: '8px 0', borderBottom: '1px solid #E2E8F0' }}>
                  <strong>{doc.title || doc.file_name}</strong>
                  <span style={{ display: 'block', fontSize: 12, color: '#64748B' }}>
                    {doc.document_type ? `${doc.document_type.replace(/_/g, ' ')} · ` : ''}
                    {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Verified'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state" style={{ padding: 16, textAlign: 'center', background: '#F8FAFC', borderRadius: 8, border: '1px dashed #CBD5E1' }}>
              <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 8px 0' }}>No certifications uploaded yet.</p>
              <Link to="/student/resume" className="btn btn-outline" style={{ fontSize: 12 }}>Upload Certificate</Link>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
