import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getSavedResumeAnalysis } from '../../utils/resumeSkillsStorage';
import { fetchStudentSkills } from '../../utils/studentSkills';
import OpportunitySkillGapCard from '../../components/student/OpportunitySkillGapCard';
import SkillMappingRoadmapModal from '../../components/modals/SkillMappingRoadmapModal';
import { calculateOpportunityMatch } from '../../utils/skillGapAnalysis';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

const TYPE_LABEL = {
  internship:    'Internship',
  placement:     'Placement / Job',
  apprenticeship:'Apprenticeship',
  training:      'Training',
  bootcamp:      'Bootcamp',
};

import { getAccessToken, clearStaleSession } from '../../services/apiClient';

export default function StudentOpportunities() {
  const { user, accessToken: authContextToken, loading: authLoading } = useAuth();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [postings, setPostings] = useState([]);
  const [loadingPostings, setLoadingPostings] = useState(true);
  const [studentSkills, setStudentSkills] = useState([]);
  const [hasSkills, setHasSkills] = useState(false);
  const [recommendations, setRecommendations] = useState(() => {
    const saved = getSavedResumeAnalysis(user?.id);
    return saved?.matches || [];
  });
  // Map of posting_id -> { applied: bool, applying: bool }
  const [applicationState, setApplicationState] = useState({});
  const [roadmapPosting, setRoadmapPosting] = useState(null);

  // Fetch all open postings and application status from FastAPI
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingPostings(true);
      try {
        const data = await apiFetch('/api/student/opportunities');
        if (mounted && data) {
          setPostings(data);
          const map = {};
          data.forEach(p => {
            if (p.has_applied) {
              map[p.id] = { applied: true, applying: false };
            }
          });
          setApplicationState(map);
        }
      } catch (err) {
        console.error('fetch postings error:', err);
      } finally {
        if (mounted) setLoadingPostings(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Fetch student skills
  useEffect(() => {
    if (user?.id) {
      fetchStudentSkills(user.id)
        .then(skills => {
          const list = skills || [];
          setStudentSkills(list);
          setHasSkills(list.length > 0);
        })
        .catch(() => {
          setStudentSkills([]);
          setHasSkills(false);
        });
    }
  }, [user?.id]);

  const apiFetch = useCallback(async (path, optsOrTimeout = 5000) => {
    // Support both (path, timeoutMs) and (path, { method, body, timeoutMs })
    const isOpts = optsOrTimeout !== null && typeof optsOrTimeout === 'object';
    const timeoutMs = isOpts ? (optsOrTimeout.timeoutMs ?? 5000) : optsOrTimeout;
    const method   = isOpts ? (optsOrTimeout.method ?? 'GET') : 'GET';
    const bodyData = isOpts ? optsOrTimeout.body : undefined;

    let accessToken = authContextToken || (await getAccessToken());
    if (!accessToken) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const buildFetchOpts = (token) => ({
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...(bodyData !== undefined ? { body: JSON.stringify(bodyData) } : {}),
    });

    try {
      let res = await fetch(`${API_BASE_URL}${path}`, buildFetchOpts(accessToken));

      if (res.status === 401 && supabase) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData?.session?.access_token) {
            accessToken = refreshData.session.access_token;
            res = await fetch(`${API_BASE_URL}${path}`, buildFetchOpts(accessToken));
          } else {
            await clearStaleSession();
          }
        } catch {
          await clearStaleSession();
        }
      }

      clearTimeout(timer);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      clearTimeout(timer);
      return null;
    }
  }, [authContextToken]);

  // Try to get AI recommendations for match scores
  useEffect(() => {
    if (authLoading) return;
    let mounted = true;
    const fetchIntel = async () => {
      const saved = getSavedResumeAnalysis(user?.id);
      if (saved?.matches?.length > 0 && mounted) setRecommendations(saved.matches);
      
      try {
        const matchData = await apiFetch('/api/student-ai/opportunities/match', {
          method: 'POST',
          body: {},
        });
        if (!mounted) return;
        if (Array.isArray(matchData?.recommendations) && matchData.recommendations.length > 0) {
          setRecommendations(matchData.recommendations);
          return;
        }
      } catch (err) {
        console.error('AI opportunity match error:', err);
      }

      const data = await apiFetch('/api/resume/intelligence');
      if (!mounted || !data) return;
      if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
      }
    };
    fetchIntel();
    return () => { mounted = false; };
  }, [authLoading, apiFetch, user?.id]);

  // Real dynamic opportunity matching calculated from postings & student skills
  const matchMap = useMemo(() => {
    const m = {};
    postings.forEach(p => {
      if (p.id) {
        m[p.id] = calculateOpportunityMatch(p, studentSkills);
      }
    });
    return m;
  }, [postings, studentSkills]);

  // Filter postings
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return postings.filter(p => {
      const companyName = p.company_name || p.companies?.name || '';
      const skills = (p.skills_list || []).join(' ').toLowerCase();
      const matchesQuery = !q ||
        [p.title, companyName, ...( p.skills_list || [])].some(v => String(v).toLowerCase().includes(q));
      const matchesType = typeFilter === 'All' || p.type === typeFilter;
      const matchesLocation = locationFilter === 'All' ||
        (p.location || '').toLowerCase().includes(locationFilter.toLowerCase()) ||
        (p.mode || '').toLowerCase().includes(locationFilter.toLowerCase());
      return matchesQuery && matchesType && matchesLocation;
    });
  }, [postings, query, typeFilter, locationFilter]);

  const handleApply = async (postingId) => {
    if (!user?.id) return;
    if (applicationState[postingId]?.applied || applicationState[postingId]?.applying) return;

    setApplicationState(prev => ({ ...prev, [postingId]: { applied: false, applying: true } }));

    try {
      await apiFetch(`/api/student/opportunities/${postingId}/apply`, {
        method: 'POST',
      });
      setApplicationState(prev => ({ ...prev, [postingId]: { applied: true, applying: false } }));
    } catch (err) {
      console.error('apply error:', err);
      setApplicationState(prev => ({ ...prev, [postingId]: { applied: false, applying: false } }));
    }
  };

  const formatMode = (mode) => {
    if (!mode) return '';
    const map = { 'on-site': 'On-site', 'remote': 'Remote', 'hybrid': 'Hybrid' };
    return map[mode] || mode;
  };

  const formatDuration = (months) => {
    if (!months) return null;
    return `${months} Month${months > 1 ? 's' : ''}`;
  };

  return (
    <main className="view-section active">
      <header className="page-header">
        <div className="header-text">
          <h1>Discover Opportunities</h1>
          <p>
            {hasSkills
              ? 'Internships, placements, training & bootcamps scored against your verified skill profile.'
              : 'Explore ALL open industry opportunities. Upload your resume to calculate personalized match scores.'}
          </p>
        </div>
        {!hasSkills && (
          <Link to="/student/resume" className="btn btn-primary">
            <i className="ph ph-file-text"></i> Upload Resume for Matching
          </Link>
        )}
      </header>

      {/* Dynamic Real-Time Skill Gap Analysis */}
      <OpportunitySkillGapCard
        postings={postings}
        studentSkills={studentSkills}
        loading={loadingPostings}
      />

      <div className="opp-filters">
        <div className="search-wrap flex-grow">
          <i className="ph ph-magnifying-glass"></i>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search by role, company, or skill..."
          />
        </div>
        <select className="clean-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="All">All Types</option>
          <option value="internship">Internship</option>
          <option value="placement">Placement / Job</option>
          <option value="training">Training</option>
          <option value="bootcamp">Bootcamp</option>
          <option value="apprenticeship">Apprenticeship</option>
        </select>
        <select className="clean-select" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
          <option value="All">All Locations</option>
          <option value="remote">Remote</option>
          <option value="Chennai">Chennai</option>
          <option value="Bengaluru">Bengaluru</option>
          <option value="Mumbai">Mumbai</option>
          <option value="Hyderabad">Hyderabad</option>
        </select>
      </div>

      {loadingPostings ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <i className="ph ph-circle-notch" style={{ fontSize: 32, display: 'block', marginBottom: 12 }}></i>
          Loading opportunities…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <i className="ph ph-folder-open" style={{ fontSize: 36, display: 'block', marginBottom: 12 }}></i>
          <p style={{ margin: 0 }}>No open opportunities found. Try adjusting filters.</p>
        </div>
      ) : (
        <div className="opp-list-vertical">
          {filtered.map((item) => {
            const appState = applicationState[item.id] || {};
            const isApplied = appState.applied;
            const isApplying = appState.applying;
            const matchInfo = matchMap[item.id];
            const companyName = item.company_name || item.companies?.name || 'Industry Partner';
            const duration = formatDuration(item.duration_months);
            const mode = formatMode(item.mode);
            const tags = item.skills_list || [];

            return (
              <article className="opp-list-card" key={item.id}>
                <div className="olc-main">
                  <h3>{item.title}</h3>
                  <p className="company">{companyName}</p>
                  <div className="olc-meta">
                    <span>
                      <i className="ph ph-briefcase"></i> {TYPE_LABEL[item.type] || item.type}
                    </span>
                    {item.location && (
                      <span>
                        <i className="ph ph-map-pin"></i> {item.location}
                      </span>
                    )}
                    {mode && (
                      <span>
                        <i className="ph ph-monitor"></i> {mode}
                      </span>
                    )}
                    {duration && (
                      <span>
                        <i className="ph ph-clock"></i> {duration}
                      </span>
                    )}
                    {item.stipend_text && (
                      <span>
                        <i className="ph ph-currency-inr"></i> {item.stipend_text}
                      </span>
                    )}
                  </div>
                  {tags.length > 0 && (
                    <div className="olc-tags">
                      {tags.slice(0, 6).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="olc-side">
                  <div className="match-score">
                    {matchInfo ? (
                      <>
                        <span className={`score ${matchInfo.isGeneral ? 'text-muted' : ''}`}>
                          {!hasSkills && matchInfo.totalRequired > 0 ? 'Upload resume' : matchInfo.matchText}
                        </span>
                        {hasSkills && matchInfo.missingText && (
                          <span className="missing">{matchInfo.missingText}</span>
                        )}
                      </>
                    ) : (
                      <span className={`score ${!hasSkills ? 'text-muted' : ''}`}>
                        {hasSkills ? 'Requirements not specified' : 'Upload resume'}
                      </span>
                    )}
                  </div>
                  <div className="olc-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setRoadmapPosting(item)}
                      style={{ fontSize: '12.5px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      title="View real-time skill mapping and personalized career roadmap"
                    >
                      <i className="ph-fill ph-sparkle" style={{ color: '#4F46E5' }} /> Skill Map
                    </button>
                    <button
                      className={`btn ${isApplied ? 'btn-outline' : 'btn-primary'}`}
                      type="button"
                      disabled={isApplied || isApplying}
                      onClick={() => handleApply(item.id)}
                    >
                      {isApplied ? (
                        <>
                          <i className="ph-fill ph-check-circle" style={{ color: '#059669' }}></i> Applied
                        </>
                      ) : isApplying ? (
                        'Applying…'
                      ) : (
                        'Apply Now'
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {roadmapPosting && (
        <SkillMappingRoadmapModal
          posting={roadmapPosting}
          studentSkills={studentSkills}
          onClose={() => setRoadmapPosting(null)}
          onApply={handleApply}
          isApplied={Boolean(applicationState[roadmapPosting.id]?.applied)}
          isApplying={Boolean(applicationState[roadmapPosting.id]?.applying)}
        />
      )}
    </main>
  );
}
