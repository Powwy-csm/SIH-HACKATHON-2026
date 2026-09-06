import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSavedResumeAnalysis } from '../../utils/resumeSkillsStorage';
import { opportunityList as fallbackOpportunities } from './studentPortalData';

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

export default function StudentOpportunities() {
  const { user, accessToken: authContextToken, loading: authLoading } = useAuth();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [location, setLocation] = useState('All');
  const [recommendations, setRecommendations] = useState(() => {
    const saved = getSavedResumeAnalysis(user?.id);
    return saved?.matches || [];
  });
  const [hasSkills, setHasSkills] = useState(() => {
    const saved = getSavedResumeAnalysis(user?.id);
    return Boolean(saved && Array.isArray(saved.skills) && saved.skills.length > 0);
  });
  const [appliedRoles, setAppliedRoles] = useState({});

  useEffect(() => {
    if (user?.id) {
      const saved = getSavedResumeAnalysis(user.id);
      if (saved && Array.isArray(saved.skills) && saved.skills.length > 0) {
        setHasSkills(true);
        if (Array.isArray(saved.matches) && saved.matches.length > 0) {
          setRecommendations(saved.matches);
        }
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
    const fetchIntel = async () => {
      const saved = getSavedResumeAnalysis(user?.id);
      if (saved && Array.isArray(saved.skills) && saved.skills.length > 0) {
        setHasSkills(true);
        if (Array.isArray(saved.matches) && saved.matches.length > 0) {
          setRecommendations(saved.matches);
          return;
        }
      }

      const data = await apiFetch('/api/resume/intelligence');
      if (!mounted || !data) return;

      if (Array.isArray(data.skills) && data.skills.length > 0) {
        setHasSkills(true);
      }
      if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
      }
    };

    fetchIntel();
    return () => {
      mounted = false;
    };
  }, [authLoading, apiFetch, user?.id]);

  // Combine backend recommendations with fallback opportunities if needed
  const displayOpportunities = useMemo(() => {
    if (recommendations.length > 0) {
      return recommendations.map((rec) => ({
        id: rec.posting_id,
        title: rec.title,
        company: rec.company || 'Tech Partner',
        type: rec.type || 'Internship',
        location: rec.location || 'Remote',
        duration: rec.duration || '3 Months',
        tags: (rec.matched_skills || []).map((s) => s.skill_name || s.name || s),
        matchScore: Math.round((rec.match_score || 0) * 100),
        match: `${Math.round((rec.match_score || 0) * 100)}% Match`,
        missing: (rec.missing_skills || []).length > 0
          ? `Missing: ${(rec.missing_skills || []).slice(0, 2).map((s) => s.skill_name || s.name || s).join(', ')}`
          : null,
      }));
    }

    return fallbackOpportunities.map((item) => ({
      id: item.title,
      ...item,
      matchScore: hasSkills ? item.match : null,
      match: hasSkills ? item.match : 'Uncalculated',
      missing: hasSkills ? item.missing : 'Upload resume to calculate match',
    }));
  }, [recommendations, hasSkills]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return displayOpportunities.filter((item) => {
      const matchesQuery =
        !q ||
        [item.title, item.company, ...(item.tags || [])].some((value) =>
          String(value).toLowerCase().includes(q)
        );
      const matchesType = type === 'All' || item.type === type;
      const matchesLocation =
        location === 'All' || item.location.toLowerCase().includes(location.toLowerCase());
      return matchesQuery && matchesType && matchesLocation;
    });
  }, [displayOpportunities, query, type, location]);

  const handleApply = (id) => {
    setAppliedRoles((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <main className="view-section active">
      <header className="page-header">
        <div className="header-text">
          <h1>Discover Opportunities</h1>
          <p>
            {hasSkills
              ? 'Internships and project roles scored against your verified skill profile.'
              : 'Explore open industry opportunities. Upload your resume to calculate personalized match scores.'}
          </p>
        </div>
        {!hasSkills && (
          <Link to="/student/resume" className="btn btn-primary">
            <i className="ph ph-file-text"></i> Upload Resume for Matching
          </Link>
        )}
      </header>

      <div className="opp-filters">
        <div className="search-wrap flex-grow">
          <i className="ph ph-magnifying-glass"></i>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="text"
            placeholder="Search by role, company, or skill..."
          />
        </div>
        <select className="clean-select" value={type} onChange={(event) => setType(event.target.value)}>
          <option>All</option>
          <option>Internship</option>
          <option>Full-time</option>
        </select>
        <select className="clean-select" value={location} onChange={(event) => setLocation(event.target.value)}>
          <option>All</option>
          <option>Remote</option>
          <option>Chennai</option>
          <option>Bengaluru</option>
        </select>
        <button className="btn btn-outline" type="button">
          <i className="ph ph-sliders-horizontal"></i> Filters
        </button>
      </div>

      <div className="opp-list-vertical">
        {filtered.map((item) => {
          const isApplied = appliedRoles[item.id];
          return (
            <article className="opp-list-card" key={item.id}>
              <div className="olc-main">
                <h3>{item.title}</h3>
                <p className="company">{item.company}</p>
                <div className="olc-meta">
                  <span>
                    <i className="ph ph-briefcase"></i> {item.type}
                  </span>
                  <span>
                    <i className="ph ph-map-pin"></i> {item.location}
                  </span>
                  <span>
                    <i className="ph ph-clock"></i> {item.duration}
                  </span>
                </div>
                <div className="olc-tags">
                  {(item.tags || []).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="olc-side">
                <div className="match-score">
                  <span className={`score ${!hasSkills ? 'text-muted' : ''}`}>{item.match}</span>
                  {item.missing && <span className="missing">{item.missing}</span>}
                </div>
                <div className="olc-actions">
                  <button
                    className={`btn ${isApplied ? 'btn-outline' : 'btn-primary'}`}
                    type="button"
                    disabled={isApplied}
                    onClick={() => handleApply(item.id)}
                  >
                    {isApplied ? (
                      <>
                        <i className="ph-fill ph-check-circle" style={{ color: '#059669' }}></i> Applied
                      </>
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
    </main>
  );
}
