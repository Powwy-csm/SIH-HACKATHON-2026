import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
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
      // Ignore non-json values
    }
  }
  return null;
}

function getSourceBadge(source, isVerified) {
  if (isVerified) {
    return { label: 'Verified', bg: '#DCFCE7', color: '#15803D', icon: 'ph-check-circle' };
  }
  const s = String(source || '').toLowerCase();
  if (s.includes('evidence') || s.includes('doc') || s.includes('certificate')) {
    return { label: 'Evidence-backed', bg: '#FEF3C7', color: '#B45309', icon: 'ph-certificate' };
  }
  if (s.includes('assess')) {
    return { label: 'Assessed', bg: '#F5F3FF', color: '#6D28D9', icon: 'ph-target' };
  }
  return { label: 'Self-reported', bg: '#EFF6FF', color: '#1D4ED8', icon: 'ph-user-check' };
}

export default function StudentProfile() {
  const { user, accessToken: authContextToken, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [skills, setSkills] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [onboardingConfig, setOnboardingConfig] = useState(null);

  const apiFetch = useCallback(async (path, timeoutMs = 15000, options = {}) => {
    const accessToken = authContextToken || getAccessToken();
    if (!accessToken) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      clearTimeout(timer);
      return null;
    }
  }, [authContextToken]);

  const loadData = useCallback(async () => {
    try {
      // Fire all endpoints concurrently in parallel
      const [profileRes, projectsRes, docsRes, listRes, configRes] = await Promise.all([
        apiFetch('/api/student/profile', 15000).then(async res => {
          if (res) return res;
          // Fallback to student-ai profile analyze if GET profile is unavailable
          return await apiFetch('/api/student-ai/profile/analyze', 15000, { method: 'POST' });
        }),
        apiFetch('/api/student/projects', 15000),
        apiFetch('/api/resume/documents', 15000),
        apiFetch('/api/resume/list', 15000),
        apiFetch('/api/onboarding/config', 15000),
      ]);

      const resolvedProfile = profileRes?.data || profileRes;
      if (resolvedProfile) {
        setProfileData(resolvedProfile);
        if (Array.isArray(resolvedProfile.skills) && resolvedProfile.skills.length > 0) {
          setSkills(resolvedProfile.skills);
        }
      }

      if (docsRes) {
        setDocuments(Array.isArray(docsRes) ? docsRes : (docsRes.documents || docsRes.data || []));
      }

      if (listRes) {
        setResumes(Array.isArray(listRes) ? listRes : (listRes.data || []));
      }
      
      if (projectsRes) {
        setProjects(Array.isArray(projectsRes) ? projectsRes : (projectsRes.data || []));
      }
      
      if (configRes) {
        setOnboardingConfig(configRes.data || configRes);
      }

      // Supabase direct fallback if profileData is missing domain/subdomain
      if (supabase && user?.id && (!resolvedProfile?.domain || !resolvedProfile?.bio)) {
        try {
          const { data: studentRow } = await supabase
            .from('students')
            .select('bio, domain_id, subdomain_id, interest_id')
            .eq('id', user.id)
            .maybeSingle();

          if (studentRow) {
            setProfileData(prev => ({
              ...prev,
              bio: prev?.bio || studentRow.bio,
            }));
          }
        } catch {
          // Ignore direct query failure
        }
      }

      // Fallback skills from localStorage if backend returned empty
      if ((!resolvedProfile?.skills || resolvedProfile.skills.length === 0) && user?.id) {
        const saved = getSavedResumeAnalysis(user.id);
        if (saved && Array.isArray(saved.skills) && saved.skills.length > 0) {
          setSkills(saved.skills);
        }
      }
    } catch (err) {
      console.error('Error fetching student profile data:', err);
    }
  }, [apiFetch, user?.id]);

  useEffect(() => {
    if (authLoading) return;

    let mounted = true;
    setLoading(true);

    loadData().finally(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [authLoading, loadData]);

  const [isEditingDomain, setIsEditingDomain] = useState(false);
  const [editDomainForm, setEditDomainForm] = useState({ domain_id: '', subdomain_id: '', interest_id: '' });

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioForm, setBioForm] = useState('');

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameForm, setNameForm] = useState('');
  
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectForm, setProjectForm] = useState({ title: '', description: '', start_date: '', end_date: '', tags: '', project_url: '' });

  const handleEditDomainStart = () => {
    setEditDomainForm({
      domain_id: profileData?.domain_id || '',
      subdomain_id: profileData?.subdomain_id || '',
      interest_id: profileData?.interest_id || ''
    });
    setIsEditingDomain(true);
  };

  const handleSaveDomain = async () => {
    const payload = {
      domain_id: editDomainForm.domain_id || null,
      subdomain_id: editDomainForm.subdomain_id || null,
      interest_id: editDomainForm.interest_id || null,
    };
    const res = await apiFetch('/api/student/profile', 8000, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (res && res.status === 'success') {
      setIsEditingDomain(false);
      loadData(); // reload to get new text names
    } else {
      alert('Failed to update domain profile.');
    }
  };

  const handleEditBioStart = () => {
    setBioForm(bio);
    setIsEditingBio(true);
  };

  const handleSaveBio = async () => {
    const res = await apiFetch('/api/student/profile', 8000, {
      method: 'PUT',
      body: JSON.stringify({ bio: bioForm })
    });
    if (res && res.status === 'success') {
      setIsEditingBio(false);
      loadData();
    } else {
      alert('Failed to update bio.');
    }
  };

  const handleEditNameStart = () => {
    setNameForm(studentName);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!nameForm.trim()) {
      alert('Name cannot be empty.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ data: { full_name: nameForm.trim() } });
    if (error) {
      alert('Failed to update name: ' + error.message);
    } else {
      setIsEditingName(false);
      loadData();
    }
  };

  const handleProjectSave = async (e) => {
    e.preventDefault();
    const payload = {
      ...projectForm,
      start_date: projectForm.start_date ? (projectForm.start_date.length === 7 ? projectForm.start_date + '-01' : projectForm.start_date) : null,
      end_date: projectForm.end_date ? (projectForm.end_date.length === 7 ? projectForm.end_date + '-01' : projectForm.end_date) : null,
      tags: projectForm.tags ? projectForm.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };
    const url = editingProjectId ? `/api/student/projects/${editingProjectId}` : '/api/student/projects';
    const method = editingProjectId ? 'PUT' : 'POST';
    
    const res = await apiFetch(url, 8000, { method, body: JSON.stringify(payload) });
    if (res && res.status === 'success') {
      setShowProjectForm(false);
      setEditingProjectId(null);
      loadData();
    } else {
      alert('Failed to save project.');
    }
  };

  const handleProjectDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    const res = await apiFetch(`/api/student/projects/${id}`, 8000, { method: 'DELETE' });
    if (res && res.status === 'success') {
      loadData();
    } else {
      alert('Failed to delete project.');
    }
  };

  const studentName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'Student');
  const avatarUrl = user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=DBEAFE&color=2563EB&size=120&bold=true`;

  const bio = profileData?.bio || user?.user_metadata?.bio || '';
  const domain = profileData?.domain || '';
  const subdomain = profileData?.subdomain || '';
  const interest = profileData?.interest || '';

  if (authLoading || loading) {
    return (
      <main className="view-section active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16 }}>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }}></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading profile details...</p>
      </main>
    );
  }

  return (
    <main className="view-section active">
      <div className="profile-hero">
        <div className="ph-avatar">
          <img src={avatarUrl} alt={studentName} />
        </div>
        <div className="ph-info">
          {!isEditingName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0 }}>{studentName}</h1>
              <button type="button" onClick={handleEditNameStart} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B', fontSize: 14 }} title="Edit Name">
                <i className="ph ph-pencil-simple"></i>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
              <input
                type="text"
                value={nameForm}
                onChange={e => setNameForm(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 18, fontWeight: 700 }}
              />
              <button type="button" onClick={handleSaveName} style={{ border: 'none', background: '#2563EB', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Save</button>
              <button type="button" onClick={() => setIsEditingName(false)} style={{ border: '1px solid #CBD5E1', background: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            </div>
          )}
          <p className="ph-headline">{subdomain || 'Student'} · {domain || 'Profile'}</p>
          <span className="open-badge">
            <i className="ph-fill ph-check-circle" style={{ marginRight: 4 }}></i>
            Verified Student Profile
          </span>
        </div>
        <div className="ph-actions">
          <Link className="btn btn-outline" to="/student/portfolio">Preview Portfolio</Link>
          <Link className="btn btn-primary" to="/student/resume"><i className="ph ph-file-text"></i> Manage Resume</Link>
        </div>
      </div>

      <div className="profile-layout">
        <div className="p-main">
          {/* About Me */}
          <section className="p-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>About Me</h2>
              {!isEditingBio ? (
                <button type="button" onClick={handleEditBioStart} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563EB', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="ph ph-pencil-simple" style={{ fontSize: 14 }}></i> Edit
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={handleSaveBio} style={{ border: 'none', background: '#2563EB', color: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>Save</button>
                  <button type="button" onClick={() => setIsEditingBio(false)} style={{ border: '1px solid #CBD5E1', background: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                </div>
              )}
            </div>
            {!isEditingBio ? (
              <p className="p-text" style={{ marginTop: 8 }}>{bio || <em style={{ color: '#94A3B8' }}>No bio added yet. Click edit to add your bio.</em>}</p>
            ) : (
              <div style={{ marginTop: 8 }}>
                <textarea
                  value={bioForm}
                  onChange={e => setBioForm(e.target.value)}
                  placeholder="Tell us about your background, goals, and interests..."
                  style={{ width: '100%', minHeight: 90, padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                />
              </div>
            )}
          </section>

          {/* Domain Profile */}
          <section className="p-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Domain Profile</h2>
              {!isEditingDomain ? (
                <button type="button" onClick={handleEditDomainStart} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563EB', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="ph ph-pencil-simple" style={{ fontSize: 14 }}></i> Edit
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={handleSaveDomain} style={{ border: 'none', background: '#2563EB', color: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>Save</button>
                  <button type="button" onClick={() => setIsEditingDomain(false)} style={{ border: '1px solid #CBD5E1', background: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                </div>
              )}
            </div>
            {!isEditingDomain ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 8 }}>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                  <span style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 }}>Primary Domain</span>
                  <strong style={{ fontSize: 14, color: '#0F172A' }}>{domain || <em style={{ color: '#94A3B8' }}>Not set</em>}</strong>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                  <span style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 }}>Specialized Subdomain</span>
                  <strong style={{ fontSize: 14, color: '#0F172A' }}>{subdomain || <em style={{ color: '#94A3B8' }}>Not set</em>}</strong>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                  <span style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 }}>Field of Interest</span>
                  <strong style={{ fontSize: 14, color: '#2563EB' }}>{interest || <em style={{ color: '#94A3B8' }}>Not set</em>}</strong>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 }}>Primary Domain</label>
                  <select value={editDomainForm.domain_id} onChange={e => { setEditDomainForm({ domain_id: e.target.value, subdomain_id: '', interest_id: '' }); }} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}>
                    <option value="">Select domain...</option>
                    {(onboardingConfig?.domains || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 }}>Subdomain</label>
                  <select value={editDomainForm.subdomain_id} onChange={e => { setEditDomainForm(prev => ({ ...prev, subdomain_id: e.target.value, interest_id: '' })); }} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} disabled={!editDomainForm.domain_id}>
                    <option value="">Select subdomain...</option>
                    {(onboardingConfig?.subdomains || []).filter(s => s.domain_id === editDomainForm.domain_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 }}>Field of Interest</label>
                  <select value={editDomainForm.interest_id} onChange={e => { setEditDomainForm(prev => ({ ...prev, interest_id: e.target.value })); }} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} disabled={!editDomainForm.subdomain_id}>
                    <option value="">Select field of interest...</option>
                    {(onboardingConfig?.fields_of_interest || []).filter(f => f.subdomain_id === editDomainForm.subdomain_id).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* Projects */}
          <section className="p-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Projects</h2>
              <button type="button" onClick={() => { setProjectForm({ title: '', description: '', start_date: '', end_date: '', tags: '', project_url: '' }); setEditingProjectId(null); setShowProjectForm(true); }} style={{ border: 'none', background: '#2563EB', color: '#fff', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ph ph-plus" style={{ fontSize: 13 }}></i> Add Project
              </button>
            </div>

            {showProjectForm && (
              <form onSubmit={handleProjectSave} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 16, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="text" placeholder="Project title *" required value={projectForm.title} onChange={e => setProjectForm(prev => ({ ...prev, title: e.target.value }))} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} />
                <textarea placeholder="Description" value={projectForm.description} onChange={e => setProjectForm(prev => ({ ...prev, description: e.target.value }))} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, minHeight: 60 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 2 }}>Start Date</label>
                    <input type="month" value={projectForm.start_date} onChange={e => setProjectForm(prev => ({ ...prev, start_date: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 2 }}>End Date</label>
                    <input type="month" value={projectForm.end_date} onChange={e => setProjectForm(prev => ({ ...prev, end_date: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} />
                  </div>
                </div>
                <input type="text" placeholder="Tags (comma separated)" value={projectForm.tags} onChange={e => setProjectForm(prev => ({ ...prev, tags: e.target.value }))} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} />
                <input type="url" placeholder="Project URL (optional)" value={projectForm.project_url} onChange={e => setProjectForm(prev => ({ ...prev, project_url: e.target.value }))} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" style={{ border: 'none', background: '#2563EB', color: '#fff', borderRadius: 6, padding: '6px 16px', fontSize: 12, cursor: 'pointer' }}>{editingProjectId ? 'Update' : 'Add'}</button>
                  <button type="button" onClick={() => { setShowProjectForm(false); setEditingProjectId(null); }} style={{ border: '1px solid #CBD5E1', background: '#fff', borderRadius: 6, padding: '6px 16px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            )}

            <div className="project-list" style={{ marginTop: 12 }}>
              {projects.length > 0 ? projects.map(project => {
                const formatDate = (ds) => {
                  if (!ds) return '';
                  try {
                    const d = new Date(ds);
                    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                  } catch { return ds; }
                };
                return (
                <article className="project-item" key={project.id} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0' }}>{project.title}</h3>
                      <span className="p-date">{formatDate(project.start_date)}{project.start_date ? ' → ' : ''}{formatDate(project.end_date) || (project.start_date ? 'Present' : '')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button type="button" onClick={() => { 
                        // Ensure tags are always an array before joining
                        const tagsList = Array.isArray(project.tags) ? project.tags : (typeof project.tags === 'string' ? JSON.parse(project.tags || '[]') : []);
                        setProjectForm({ 
                          title: project.title || '', 
                          description: project.description || '', 
                          start_date: (project.start_date || '').substring(0, 7), 
                          end_date: (project.end_date || '').substring(0, 7), 
                          tags: tagsList.join(', '), 
                          project_url: project.project_url || '' 
                        }); 
                        setEditingProjectId(project.id); 
                        setShowProjectForm(true); 
                      }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563EB', fontSize: 14 }}>
                        <i className="ph ph-pencil-simple"></i>
                      </button>
                      <button type="button" onClick={() => handleProjectDelete(project.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#DC2626', fontSize: 14 }}>
                        <i className="ph ph-trash"></i>
                      </button>
                    </div>
                  </div>
                  {project.description && <p className="p-text" style={{ marginTop: 6 }}>{project.description}</p>}
                  {project.project_url && <a href={project.project_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#2563EB', textDecoration: 'none' }}><i className="ph ph-arrow-square-out" style={{ fontSize: 11 }}></i> View Project</a>}
                  {project.tags && project.tags.length > 0 && (
                    <div className="p-tags" style={{ marginTop: 6 }}>
                      {(Array.isArray(project.tags) ? project.tags : (typeof project.tags === 'string' ? JSON.parse(project.tags || '[]') : [])).map(tag => <span key={tag}>{tag}</span>)}
                    </div>
                  )}
                </article>
              )}) : (
                <div style={{ padding: 20, textAlign: 'center', background: '#F8FAFC', borderRadius: 8, border: '1px dashed #CBD5E1' }}>
                  <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>No projects yet. Add your first project.</p>
                </div>
              )}
            </div>
          </section>

          {/* Education */}
          <section className="p-section">
            <h2>Education</h2>
            <div className="edu-item">
              <h3>SSN College of Engineering</h3>
              <p className="degree">{subdomain || 'Computer Science & Engineering'}</p>
              <span className="p-date">
                2023 - 2027
                {profileData?.academic_record?.cgpa_till_date ? ` · CGPA: ${profileData.academic_record.cgpa_till_date}` : ''}
                {profileData?.academic_record?.attendance_percentage && ` · Attendance: ${profileData.academic_record.attendance_percentage}%`}
              </span>
            </div>
          </section>
        </div>

        <aside className="p-side">
          {/* Top Skills */}
          <section className="p-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Top Skills</h2>
              <span style={{ fontSize: 12, color: '#64748B' }}>{skills.length} Total</span>
            </div>

            {skills.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {skills.map(skill => {
                  const name = skill.skill_name || skill.skill || skill.name || 'Skill';
                  const score = Math.round(Number(skill.proficiency_score || skill.score || 75));
                  const isVerified = Boolean(skill.is_verified || skill.isVerified || skill.status === 'verified');
                  const badge = getSourceBadge(skill.source, isVerified);

                  return (
                    <div
                      key={skill.skill_id || name}
                      style={{
                        padding: '10px 14px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ fontSize: 13, color: '#0F172A' }}>{name}</strong>
                          {isVerified && <i className="ph-fill ph-check-circle" style={{ color: '#10B981', fontSize: 14 }}></i>}
                        </div>
                        <span style={{ fontSize: 11, color: '#64748B' }}>{score}% Confidence</span>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 16, textAlign: 'center', background: '#F8FAFC', borderRadius: 8, border: '1px dashed #CBD5E1' }}>
                <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 8px 0' }}>No skills recorded yet.</p>
                <Link to="/student/assessment" className="btn btn-outline" style={{ fontSize: 12 }}>Take Skill Assessment</Link>
              </div>
            )}
          </section>

          {/* Certifications */}
          <section className="p-section">
            <h2>Certifications</h2>
            {documents.length > 0 ? (
              <ul className="clean-list">
                {documents.map(doc => (
                  <li key={doc.document_id || doc.id} style={{ marginBottom: 10 }}>
                    <strong>{doc.title || doc.file_name}</strong>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      {doc.document_type ? `${doc.document_type.replace(/_/g, ' ')} · ` : ''}
                      {doc.is_verified ? 'Verified Credential' : 'Uploaded Document'}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ padding: 16, textAlign: 'center', background: '#F8FAFC', borderRadius: 8, border: '1px dashed #CBD5E1' }}>
                <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 8px 0' }}>No certifications yet.</p>
                <Link to="/student/resume" className="btn btn-outline" style={{ fontSize: 12 }}>Upload documents to verify your skills</Link>
              </div>
            )}
          </section>

          {/* Career Interests */}
          <section className="p-section">
            <h2>Career Interests</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {interest ? (
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 16,
                    background: '#EFF6FF',
                    color: '#2563EB',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {interest}
                </span>
              ) : (
                <p style={{ color: '#94A3B8', fontSize: 13, margin: 0, fontStyle: 'italic' }}>No career interest selected yet.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
