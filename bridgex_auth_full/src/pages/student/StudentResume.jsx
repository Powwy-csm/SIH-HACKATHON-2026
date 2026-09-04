import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const POLL_INTERVAL_MS = 2500;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const RESUME_ACCEPTED_TYPES = ['application/pdf'];
const PROOF_ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

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
      // Ignore unrelated/malformed localStorage entries.
    }
  }

  return null;
}

function unwrapPayload(payload) {
  if (!payload) return {};
  if (payload.data && typeof payload.data === 'object') return payload.data;
  return payload;
}

function normalizeSkills(payload) {
  const data = unwrapPayload(payload);
  const candidates = data.skills || data.extracted_skills || data.normalized_skills || [];
  if (!Array.isArray(candidates)) return [];

  return candidates.map((item, index) => {
    if (typeof item === 'string') {
      return {
        name: item,
        confidence: 60,
        category: 'Skill',
        id: `${item}-${index}`,
        isVerified: false,
        evidenceUrl: null,
        source: 'ai_estimated',
      };
    }

    const skillName =
      item.matched_skill_name ||
      item.normalized_skill_name ||
      item.raw_skill_name ||
      item.skill_name ||
      item.skill ||
      item.name ||
      '';

    const isVerified = Boolean(
      item.is_verified ||
      item.status === 'verified' ||
      item.source === 'document_verified' ||
      item.source === 'verified'
    );

    const confidenceRaw =
      item.confidence ??
      item.confidence_score ??
      item.normalization_confidence ??
      item.extraction_confidence ??
      item.score ??
      (isVerified ? 0.95 : 0.60);

    const num = Number(confidenceRaw);
    const confidence = isVerified
      ? Math.max(95, Number.isFinite(num) ? (num <= 1 ? Math.round(num * 100) : Math.round(num)) : 95)
      : (Number.isFinite(num) ? (num <= 1 ? Math.round(num * 100) : Math.round(num)) : 60);

    return {
      name: skillName || 'Unknown skill',
      confidence: Math.max(0, Math.min(100, confidence)),
      category: item.category || item.skill_type || (isVerified ? 'Verified Credential' : item.source === 'ai_estimated' ? 'Resume Claim' : item.source) || 'Skill',
      id: item.id || `${skillName || index}-${index}`,
      isVerified,
      evidenceUrl: item.evidence_url || null,
      source: item.source || (isVerified ? 'document_verified' : 'ai_estimated'),
    };
  }).filter(skill => skill.name && skill.name !== 'Unknown skill');
}

function normalizeMatches(payload) {
  const data = unwrapPayload(payload);
  const candidates = data.recommendations || data.matches || data.opportunities || data.internships || [];
  if (!Array.isArray(candidates)) return [];

  return candidates.map((item, index) => {
    const scoreRaw = item.match_score ?? item.score ?? item.matchScore ?? item.similarity ?? 0;
    const score = Number(scoreRaw) <= 1 ? Number(scoreRaw) * 100 : Number(scoreRaw);
    return {
      id: item.id || item.posting_id || item.opportunity_id || item.internship_id || `match-${index}`,
      title: item.title || item.opportunity_title || item.role || item.position || 'Internship opportunity',
      company: item.company || item.company_name || item.organization || 'Company',
      score: Number.isFinite(score) ? Math.round(Math.max(0, Math.min(100, score))) : 0,
      matched: item.matched_skills || item.matched || item.matching_skills || [],
      missing: item.missing_skills || item.missing || item.skill_gaps || [],
      location: item.location || item.city || '',
      type: item.type || item.work_type || 'Internship',
    };
  });
}

function getStatusLabel(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('complete') || normalized === 'completed' || normalized === 'success') return 'Analysis complete';
  if (normalized.includes('fail') || normalized.includes('error')) return 'Analysis failed';
  if (normalized.includes('process') || normalized.includes('queue') || normalized.includes('pending')) return 'AI analysis in progress';
  return 'Resume ready';
}

function getFileIcon(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'ph-file-pdf';
  if (['png', 'jpg', 'jpeg'].includes(ext)) return 'ph-file-image';
  if (['doc', 'docx'].includes(ext)) return 'ph-file-doc';
  return 'ph-file';
}

export default function StudentResume() {
  const inputRef = useRef(null);
  const proofInputRef = useRef(null);
  const pollingRef = useRef(null);

  // Resume state
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [skills, setSkills] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Proof document verification state
  const [proofFile, setProofFile] = useState(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofDragActive, setProofDragActive] = useState(false);
  const [proofError, setProofError] = useState('');
  const [proofNotice, setProofNotice] = useState('');
  const [proofResult, setProofResult] = useState(null);
  const [documents, setDocuments] = useState([]);

  // Filter state for skills view
  const [skillFilter, setSkillFilter] = useState('all'); // 'all' | 'verified' | 'unverified'

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const apiFetch = useCallback(async (path, options = {}) => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      const authError = new Error('Your BridgeX session is not connected to the API yet. Sign in with the Supabase-backed student account before uploading a resume.');
      authError.code = 'NO_TOKEN';
      throw authError;
    }

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${accessToken}`);
    if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');

    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    let payload = null;
    try { payload = await response.json(); } catch { /* Empty response */ }

    if (!response.ok) {
      const detail = payload?.detail || payload?.message || `Request failed (${response.status})`;
      const requestError = new Error(detail);
      requestError.status = response.status;
      throw requestError;
    }
    return payload;
  }, []);

  const loadIntelligence = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const latest = await apiFetch('/api/resume/latest');
      const latestData = unwrapPayload(latest);
      setStatus(latestData);

      const intelligence = await apiFetch('/api/resume/intelligence');
      setSkills(normalizeSkills(intelligence));
      setMatches(normalizeMatches(intelligence));

      // Fetch uploaded supporting proof documents
      try {
        const docsData = await apiFetch('/api/resume/documents');
        const docs = Array.isArray(docsData) ? docsData : (docsData?.documents || []);
        setDocuments(docs);
      } catch {
        // Continue even if documents fetch fails gracefully
      }

      setError('');
    } catch (err) {
      if (err.code !== 'NO_TOKEN' && err.status !== 404) setError(err.message || 'Unable to load resume intelligence.');
      if (err.status === 404) {
        setSkills([]);
        setMatches([]);
        setStatus(null);
      }
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadIntelligence(true);
    return clearPolling;
  }, [loadIntelligence, clearPolling]);

  const startPolling = useCallback(() => {
    clearPolling();
    let attempts = 0;
    pollingRef.current = window.setInterval(async () => {
      attempts += 1;
      try {
        const latest = await apiFetch('/api/resume/latest');
        const latestData = unwrapPayload(latest);
        setStatus(latestData);
        const state = String(latestData?.status || latestData?.processing_status || '').toLowerCase();
        const done = state.includes('complete') || state.includes('success') || state.includes('failed') || state.includes('error');
        if (done || attempts >= 24) {
          clearPolling();
          await loadIntelligence(false);
        }
      } catch (err) {
        clearPolling();
        setError(err.message || 'Unable to refresh resume processing status.');
      }
    }, POLL_INTERVAL_MS);
  }, [apiFetch, clearPolling, loadIntelligence]);

  const validateResumeFile = (candidate) => {
    if (!candidate) return 'Please choose a PDF resume.';
    if (!RESUME_ACCEPTED_TYPES.includes(candidate.type) && !candidate.name.toLowerCase().endsWith('.pdf')) return 'Only PDF resumes are supported.';
    if (candidate.size > MAX_FILE_SIZE) return 'The resume must be smaller than 10 MB.';
    return '';
  };

  const chooseResumeFile = (candidate) => {
    const validationError = validateResumeFile(candidate);
    setError(validationError);
    setNotice('');
    if (validationError) return;
    setFile(candidate);
  };

  const handleResumeUpload = async () => {
    if (!file) {
      setError('Choose your latest PDF resume first.');
      return;
    }

    setUploading(true);
    setError('');
    setNotice('Uploading your resume securely. AI analysis will continue in the background.');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiFetch('/api/resume/upload', { method: 'POST', body: formData });
      setStatus(unwrapPayload(result));
      setNotice('Resume uploaded. We are extracting skills and matching internships in the background.');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      await loadIntelligence(false);
      startPolling();
    } catch (err) {
      setError(err.message || 'Resume upload failed. Please try again.');
      setNotice('');
    } finally {
      setUploading(false);
    }
  };

  const validateProofFile = (candidate) => {
    if (!candidate) return 'Please select a supporting document.';
    const ext = candidate.name.toLowerCase().split('.').pop();
    const validExts = ['pdf', 'docx', 'png', 'jpg', 'jpeg'];
    if (!validExts.includes(ext)) {
      return 'Supported proof formats: PDF, DOCX, PNG, JPG.';
    }
    if (candidate.size > MAX_FILE_SIZE) return 'The document must be smaller than 10 MB.';
    return '';
  };

  const chooseProofFile = (candidate) => {
    const validationError = validateProofFile(candidate);
    setProofError(validationError);
    setProofNotice('');
    setProofResult(null);
    if (validationError) return;
    setProofFile(candidate);
  };

  const handleProofUpload = async () => {
    if (!proofFile) {
      setProofError('Choose a certificate or supporting document first.');
      return;
    }

    setProofUploading(true);
    setProofError('');
    setProofNotice('AI is reading the document, extracting verified credentials, and corroborating your skills...');
    setProofResult(null);

    try {
      const formData = new FormData();
      formData.append('file', proofFile);
      const result = await apiFetch('/api/resume/verify-document', {
        method: 'POST',
        body: formData,
      });
      const data = unwrapPayload(result);
      setProofResult(data);
      setProofNotice(data?.message || 'Document successfully analyzed and skills verified!');
      setProofFile(null);
      if (proofInputRef.current) proofInputRef.current.value = '';
      await loadIntelligence(false);
    } catch (err) {
      setProofError(err.message || 'Document verification failed. Please try again.');
      setProofNotice('');
    } finally {
      setProofUploading(false);
    }
  };

  // Filter skills
  const verifiedSkills = useMemo(() => skills.filter(s => s.isVerified), [skills]);
  const unverifiedSkills = useMemo(() => skills.filter(s => !s.isVerified), [skills]);

  const displayedSkills = useMemo(() => {
    if (skillFilter === 'verified') return verifiedSkills;
    if (skillFilter === 'unverified') return unverifiedSkills;
    return skills;
  }, [skillFilter, skills, verifiedSkills, unverifiedSkills]);

  const statusText = getStatusLabel(status?.status || status?.processing_status);
  const hasResume = Boolean(status?.resume_id || status?.id || status?.file_name || status?.filename || skills.length || matches.length);
  const processing = /progress|queue|pending/i.test(String(status?.status || status?.processing_status || ''));

  return (
    <main className="view-section active resume-intelligence-page">
      <style>{`
        .resume-intelligence-page { max-width: 1320px; }
        .resume-hero { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; margin-bottom:28px; }
        .resume-kicker { display:inline-flex; align-items:center; gap:7px; color:#2563EB; font-size:13px; font-weight:700; letter-spacing:.02em; margin-bottom:8px; }
        .resume-kicker i { font-size:17px; }
        .resume-hero h1 { font-size:30px; line-height:1.2; margin-bottom:8px; color:#0F172A; }
        .resume-hero p { color:#64748B; max-width:720px; font-size:15px; line-height:1.5; }

        .verification-callout {
          background: linear-gradient(135deg, #ECFDF5 0%, #EFF6FF 100%);
          border: 1px solid #A7F3D0;
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .callout-content { display: flex; align-items: flex-start; gap: 14px; }
        .callout-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #10B981;
          color: #fff;
          display: grid;
          place-items: center;
          font-size: 22px;
          flex-shrink: 0;
        }
        .callout-text h4 { font-size: 15px; font-weight: 700; color: #065F46; margin: 0 0 3px; }
        .callout-text p { font-size: 13px; color: #047857; margin: 0; line-height: 1.4; }
        .callout-stats { display: flex; gap: 16px; flex-shrink: 0; }
        .stat-badge {
          background: #fff;
          border: 1px solid #D1FAE5;
          padding: 8px 14px;
          border-radius: 12px;
          text-align: center;
        }
        .stat-badge .val { font-size: 18px; font-weight: 800; color: #059669; line-height: 1; display: block; margin-bottom: 3px; }
        .stat-badge .lbl { font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: .03em; }

        .resume-grid { display:grid; grid-template-columns:minmax(0,1.2fr) minmax(0,1fr); gap:24px; align-items:start; }
        .resume-card { background:#fff; border:1px solid #E2E8F0; border-radius:18px; box-shadow:0 6px 24px rgba(15,23,42,.04); }
        .upload-card { padding:26px; }
        .upload-card h2, .skills-card h2, .matches-card h2, .proof-card h2 { font-size:19px; margin-bottom:6px; color:#0F172A; }
        .card-subtitle { color:#64748B; font-size:14px; margin-bottom:20px; line-height:1.4; }
        
        .dropzone { border:1.5px dashed #BFDBFE; background:#F8FBFF; border-radius:16px; min-height:190px; display:flex; align-items:center; justify-content:center; text-align:center; padding:24px; transition:.2s ease; cursor:pointer; }
        .dropzone.proof-dropzone { border-color:#A7F3D0; background:#F0FDF4; min-height:180px; }
        .dropzone.active { border-color:#2563EB; background:#EFF6FF; }
        .dropzone.proof-dropzone.active { border-color:#10B981; background:#ECFDF5; }
        .dropzone.has-file { min-height:140px; }
        .upload-icon { width:50px; height:50px; display:grid; place-items:center; margin:0 auto 12px; border-radius:14px; background:#DBEAFE; color:#2563EB; font-size:25px; }
        .upload-icon.proof { background:#D1FAE5; color:#059669; }
        .dropzone h3 { font-size:15px; font-weight:600; margin-bottom:4px; color:#1E293B; }
        .dropzone p { color:#64748B; font-size:13px; margin-bottom:14px; }
        .file-name { font-weight:650; color:#172033; word-break:break-word; }
        .file-meta { font-size:12px; color:#64748B; margin-top:4px; }
        
        .upload-actions { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-top:16px; }
        .upload-actions .helper { color:#64748B; font-size:12px; }
        .resume-button { display:inline-flex; align-items:center; justify-content:center; gap:8px; border:0; border-radius:11px; padding:11px 17px; font:600 14px inherit; cursor:pointer; transition:.15s ease; }
        .resume-button.primary { background:#2563EB; color:#fff; box-shadow:0 4px 12px rgba(37,99,235,.2); }
        .resume-button.primary:hover:not(:disabled) { background:#1D4ED8; transform:translateY(-1px); }
        .resume-button.verified-btn { background:#059669; color:#fff; box-shadow:0 4px 12px rgba(5,150,105,.2); }
        .resume-button.verified-btn:hover:not(:disabled) { background:#047857; transform:translateY(-1px); }
        .resume-button.secondary { background:#fff; color:#172033; border:1px solid #E2E8F0; }
        .resume-button.secondary:hover:not(:disabled) { background:#F8FAFC; border-color:#CBD5E1; }
        .resume-button:disabled { opacity:.55; cursor:not-allowed; transform:none; }
        
        .status-card { padding:24px; }
        .status-top { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; }
        .status-badge { display:inline-flex; align-items:center; gap:7px; padding:6px 10px; border-radius:999px; background:#ECFDF3; color:#15803D; font-size:12px; font-weight:700; }
        .status-dot { width:7px; height:7px; border-radius:50%; background:currentColor; }
        .status-badge.processing { background:#EFF6FF; color:#2563EB; }
        .status-row { display:flex; justify-content:space-between; gap:16px; padding:10px 0; border-bottom:1px solid #F1F5F9; font-size:13px; }
        .status-row:last-child { border-bottom:0; }
        .status-row span:first-child { color:#64748B; }
        .status-row strong { text-align:right; font-weight:600; max-width:58%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        
        .alert { display:flex; gap:10px; align-items:flex-start; border-radius:12px; padding:12px 14px; font-size:13px; margin-top:16px; line-height:1.45; }
        .alert.error { background:#FEF2F2; color:#991B1B; border:1px solid #FECACA; }
        .alert.notice { background:#EFF6FF; color:#1E40AF; border:1px solid #BFDBFE; }
        .alert.verified-success { background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0; }
        
        .proof-results-box {
          margin-top: 16px;
          padding: 14px;
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-radius: 12px;
        }
        .proof-results-box h5 { font-size: 13px; font-weight: 700; color: #166534; margin: 0 0 8px; display: flex; align-items: center; gap: 6px; }
        .proof-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .proof-pill-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 6px;
          background: #DCFCE7;
          border: 1px solid #86EFAC;
          font-size: 12px;
          font-weight: 600;
          color: #15803D;
        }

        .skills-card, .matches-card { margin-top:24px; padding:26px; }
        .skills-header, .matches-header { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:16px; flex-wrap:wrap; }
        
        .skill-filter-tabs { display:flex; gap:6px; background:#F1F5F9; padding:3px; border-radius:10px; }
        .skill-tab-btn {
          border:0;
          background:transparent;
          padding:6px 12px;
          border-radius:7px;
          font-size:12px;
          font-weight:600;
          color:#64748B;
          cursor:pointer;
          transition:.15s ease;
        }
        .skill-tab-btn.active { background:#fff; color:#0F172A; box-shadow:0 2px 6px rgba(15,23,42,.08); }
        .skill-tab-btn .badge {
          margin-left: 5px;
          padding: 1px 6px;
          border-radius: 999px;
          font-size: 11px;
          background: #E2E8F0;
          color: #475569;
        }
        .skill-tab-btn.active .badge { background: #DBEAFE; color: #1D4ED8; }

        .skill-cloud { display:flex; flex-wrap:wrap; gap:10px; }
        .intel-skill {
          display:inline-flex;
          align-items:center;
          gap:8px;
          border:1px solid #E2E8F0;
          background:#F8FAFC;
          color:#1E293B;
          padding:8px 12px;
          border-radius:10px;
          font-size:13px;
          font-weight:500;
          transition:.15s ease;
        }
        .intel-skill:hover { transform:translateY(-1px); box-shadow:0 3px 8px rgba(0,0,0,.04); }
        .intel-skill.is-verified {
          border-color: #86EFAC;
          background: #F0FDF4;
          color: #14532D;
          font-weight: 600;
        }
        .intel-skill.is-verified i { color: #16A34A; font-size: 15px; }
        
        .skill-confidence {
          color:#64748B;
          font-weight:700;
          font-size:11px;
          background:#F1F5F9;
          padding:3px 7px;
          border-radius:6px;
        }
        .skill-confidence.verified-conf {
          background: #DCFCE7;
          color: #15803D;
        }

        .empty-state { text-align:center; padding:32px 20px; color:#64748B; }
        .empty-state i { display:block; font-size:32px; color:#94A3B8; margin-bottom:10px; }

        /* Documents table / list */
        .documents-section { margin-top:24px; padding:24px; background:#fff; border:1px solid #E2E8F0; border-radius:18px; }
        .doc-list { display:grid; gap:10px; margin-top:14px; }
        .doc-item {
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:12px 16px;
          background:#F8FAFC;
          border:1px solid #E2E8F0;
          border-radius:12px;
          gap:14px;
        }
        .doc-item-left { display:flex; align-items:center; gap:12px; }
        .doc-file-icon {
          width:38px;
          height:38px;
          border-radius:8px;
          background:#E0E7FF;
          color:#4338CA;
          display:grid;
          place-items:center;
          font-size:20px;
          flex-shrink:0;
        }
        .doc-title { font-size:14px; font-weight:600; color:#1E293B; margin-bottom:2px; }
        .doc-meta { font-size:12px; color:#64748B; display:flex; gap:12px; }
        .doc-badge {
          display:inline-flex;
          align-items:center;
          gap:5px;
          background:#ECFDF5;
          color:#059669;
          font-size:11px;
          font-weight:700;
          padding:4px 8px;
          border-radius:6px;
          border:1px solid #A7F3D0;
        }

        .match-list { display:grid; gap:14px; }
        .match-item { border:1px solid #E2E8F0; border-radius:14px; padding:18px; background:#fff; transition:.15s ease; }
        .match-item:hover { border-color:#CBD5E1; box-shadow:0 4px 14px rgba(15,23,42,.04); }
        .match-main { display:flex; justify-content:space-between; gap:16px; }
        .match-title { font-size:16px; font-weight:700; margin-bottom:4px; color:#0F172A; }
        .match-company { color:#64748B; font-size:13px; font-weight:500; }
        .match-score { min-width:62px; height:40px; display:grid; place-items:center; border-radius:10px; background:#ECFDF3; color:#15803D; font-weight:800; font-size:14px; }
        .match-location { color:#64748B; font-size:12px; margin-top:10px; display:flex; align-items:center; gap:5px; }
        .match-skills { display:flex; flex-wrap:wrap; gap:7px; margin-top:14px; }
        .match-skill { font-size:11px; padding:4px 8px; border-radius:6px; background:#F0FDF4; color:#166534; font-weight:500; }
        .match-skill.verified-match { background:#DCFCE7; color:#14532D; border:1px solid #86EFAC; font-weight:600; }
        .match-skill.missing { background:#FFF7ED; color:#9A3412; }
        .processing-note { display:flex; align-items:center; gap:10px; color:#2563EB; font-size:13px; background:#EFF6FF; border:1px solid #DBEAFE; padding:12px 14px; border-radius:11px; margin-top:18px; }
        .spinner { width:15px; height:15px; border:2px solid #BFDBFE; border-top-color:#2563EB; border-radius:50%; animation:resume-spin .7s linear infinite; }
        .spinner.green { border-color:#BBF7D0; border-top-color:#059669; }
        @keyframes resume-spin { to { transform:rotate(360deg); } }
        
        @media (max-width: 960px) {
          .resume-grid { grid-template-columns:1fr; }
          .resume-hero { align-items:flex-start; flex-direction:column; }
          .verification-callout { flex-direction:column; align-items:stretch; }
          .callout-stats { justify-content:space-between; }
        }
        @media (max-width: 640px) {
          .resume-intelligence-page { padding:24px 16px 60px !important; }
          .upload-actions { align-items:stretch; flex-direction:column; }
          .resume-button { width:100%; }
          .match-main { flex-direction:column; }
          .match-score { width:58px; }
          .doc-item { flex-direction:column; align-items:flex-start; gap:10px; }
        }
      `}</style>

      {/* Hero Header */}
      <div className="resume-hero">
        <div>
          <span className="resume-kicker"><i className="ph-fill ph-sparkle"></i> AI-powered career intelligence & verification</span>
          <h1>Resume Intelligence & Skill Corroboration</h1>
          <p>Extract your skills, corroborate self-reported claims with certificates, and unlock high-confidence internship recommendations.</p>
        </div>
      </div>

      {/* Verification Impact Callout */}
      <div className="verification-callout">
        <div className="callout-content">
          <div className="callout-icon"><i className="ph-fill ph-shield-check"></i></div>
          <div className="callout-text">
            <h4>Corroborate Skills for 95–100% Trust</h4>
            <p>Self-reported resume claims start with baseline ~60% confidence. Upload course certificates, credentials, or project reports to elevate your skills to <strong>Verified (95%)</strong> and rank higher in employer matching.</p>
          </div>
        </div>
        <div className="callout-stats">
          <div className="stat-badge">
            <span className="val">{verifiedSkills.length}</span>
            <span className="lbl">Verified</span>
          </div>
          <div className="stat-badge">
            <span className="val">{skills.length}</span>
            <span className="lbl">Total Skills</span>
          </div>
          <div className="stat-badge">
            <span className="val">{documents.length}</span>
            <span className="lbl">Credentials</span>
          </div>
        </div>
      </div>

      {/* Upload and Verification Row */}
      <div className="resume-grid">
        {/* Step 1: Resume Upload Card */}
        <section className="resume-card upload-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ background: '#DBEAFE', color: '#1D4ED8', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>STEP 1</span>
            <h2 style={{ margin: 0 }}>Resume Analysis</h2>
          </div>
          <p className="card-subtitle">Upload your latest PDF resume to extract raw skills and career baseline.</p>

          <div
            className={`dropzone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => { event.preventDefault(); setDragActive(false); chooseResumeFile(event.dataTransfer.files?.[0]); }}
            onClick={() => !file && inputRef.current?.click()}
          >
            {!file ? (
              <div>
                <div className="upload-icon"><i className="ph ph-file-arrow-up"></i></div>
                <h3>Drop your PDF resume here</h3>
                <p>Text-based or scanned PDFs up to 10 MB.</p>
                <button className="resume-button secondary" type="button" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                  <i className="ph ph-upload-simple"></i> Choose resume
                </button>
                <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => chooseResumeFile(event.target.files?.[0])} />
              </div>
            ) : (
              <div>
                <div className="upload-icon"><i className="ph-fill ph-file-pdf"></i></div>
                <div className="file-name">{file.name}</div>
                <div className="file-meta">{(file.size / (1024 * 1024)).toFixed(2)} MB · PDF</div>
                <div style={{ marginTop: 14, display: 'flex', gap: 9, justifyContent: 'center' }}>
                  <button className="resume-button secondary" type="button" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} disabled={uploading}>Replace</button>
                  <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => chooseResumeFile(event.target.files?.[0])} />
                </div>
              </div>
            )}
          </div>

          <div className="upload-actions">
            <span className="helper">PDF only · max 10 MB</span>
            <button className="resume-button primary" type="button" disabled={!file || uploading} onClick={handleResumeUpload}>
              {uploading ? <><span className="spinner"></span> Uploading...</> : <><i className="ph ph-sparkle"></i> Analyze resume</>}
            </button>
          </div>

          {notice && <div className="alert notice"><i className="ph-fill ph-info"></i><span>{notice}</span></div>}
          {error && <div className="alert error"><i className="ph-fill ph-warning-circle"></i><span>{error}</span></div>}
          {processing && <div className="processing-note"><span className="spinner"></span> Gemini AI is extracting skills and the matching engine is preparing opportunities.</div>}
        </section>

        {/* Step 2: Document Verification Card */}
        <section className="resume-card upload-card proof-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ background: '#D1FAE5', color: '#047857', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>STEP 2</span>
            <h2 style={{ margin: 0 }}>Corroborate Skills</h2>
          </div>
          <p className="card-subtitle">Upload certificates, credentials, or project reports to prove your skills.</p>

          <div
            className={`dropzone proof-dropzone ${proofDragActive ? 'active' : ''} ${proofFile ? 'has-file' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setProofDragActive(true); }}
            onDragLeave={() => setProofDragActive(false)}
            onDrop={(event) => { event.preventDefault(); setProofDragActive(false); chooseProofFile(event.dataTransfer.files?.[0]); }}
            onClick={() => !proofFile && proofInputRef.current?.click()}
          >
            {!proofFile ? (
              <div>
                <div className="upload-icon proof"><i className="ph ph-certificate"></i></div>
                <h3>Drop certificate or proof document here</h3>
                <p>Supports PDF, DOCX, PNG, or JPG up to 10 MB.</p>
                <button className="resume-button secondary" type="button" onClick={(e) => { e.stopPropagation(); proofInputRef.current?.click(); }}>
                  <i className="ph ph-upload-simple"></i> Choose proof document
                </button>
                <input ref={proofInputRef} type="file" accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" hidden onChange={(event) => chooseProofFile(event.target.files?.[0])} />
              </div>
            ) : (
              <div>
                <div className="upload-icon proof"><i className={`ph-fill ${getFileIcon(proofFile.name)}`}></i></div>
                <div className="file-name">{proofFile.name}</div>
                <div className="file-meta">{(proofFile.size / (1024 * 1024)).toFixed(2)} MB · {proofFile.name.split('.').pop()?.toUpperCase()}</div>
                <div style={{ marginTop: 14, display: 'flex', gap: 9, justifyContent: 'center' }}>
                  <button className="resume-button secondary" type="button" onClick={(e) => { e.stopPropagation(); proofInputRef.current?.click(); }} disabled={proofUploading}>Replace</button>
                  <input ref={proofInputRef} type="file" accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" hidden onChange={(event) => chooseProofFile(event.target.files?.[0])} />
                </div>
              </div>
            )}
          </div>

          <div className="upload-actions">
            <span className="helper">PDF, DOCX, PNG, JPG · max 10 MB</span>
            <button className="resume-button verified-btn" type="button" disabled={!proofFile || proofUploading} onClick={handleProofUpload}>
              {proofUploading ? <><span className="spinner green"></span> Verifying with AI...</> : <><i className="ph ph-seal-check"></i> Verify skills</>}
            </button>
          </div>

          {proofNotice && <div className="alert verified-success"><i className="ph-fill ph-check-circle"></i><span>{proofNotice}</span></div>}
          {proofError && <div className="alert error"><i className="ph-fill ph-warning-circle"></i><span>{proofError}</span></div>}

          {proofResult && proofResult.verified_skills?.length > 0 && (
            <div className="proof-results-box">
              <h5><i className="ph-fill ph-sparkle"></i> Newly Corroborated Skills:</h5>
              <div className="proof-pills">
                {proofResult.verified_skills.map((item, idx) => (
                  <span className="proof-pill-item" key={`new-verified-${idx}`}>
                    ✓ {item.skill_name} <span style={{ opacity: 0.8, fontSize: 11 }}>(95% confidence)</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Proof Documents Log Section */}
      {documents.length > 0 && (
        <section className="documents-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 18, margin: '0 0 4px', color: '#0F172A' }}>Verified Proof Documents ({documents.length})</h2>
              <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>These supporting documents serve as tangible evidence corroborating your skill profile.</p>
            </div>
          </div>
          <div className="doc-list">
            {documents.map((doc, idx) => (
              <div className="doc-item" key={doc.id || `doc-${idx}`}>
                <div className="doc-item-left">
                  <div className="doc-file-icon"><i className={`ph-fill ${getFileIcon(doc.file_name || doc.title)}`}></i></div>
                  <div>
                    <div className="doc-title">{doc.title || doc.file_name || 'Supporting Document'}</div>
                    <div className="doc-meta">
                      <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Verified'}</span>
                      {doc.skills_verified && doc.skills_verified.length > 0 && (
                        <span>Corroborates: {doc.skills_verified.slice(0, 4).join(', ')}{doc.skills_verified.length > 4 ? ` +${doc.skills_verified.length - 4} more` : ''}</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="doc-badge"><i className="ph-fill ph-seal-check"></i> Verified Proof</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI-Extracted & Verified Skills Card */}
      <section className="resume-card skills-card">
        <div className="skills-header">
          <div>
            <h2>Skills Profile & Corroboration</h2>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              Skills normalized from your resume. Verified skills carry 95%+ confidence backed by proof credentials.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="skill-filter-tabs">
              <button
                type="button"
                className={`skill-tab-btn ${skillFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSkillFilter('all')}
              >
                All <span className="badge">{skills.length}</span>
              </button>
              <button
                type="button"
                className={`skill-tab-btn ${skillFilter === 'verified' ? 'active' : ''}`}
                onClick={() => setSkillFilter('verified')}
              >
                ✓ Verified <span className="badge">{verifiedSkills.length}</span>
              </button>
              <button
                type="button"
                className={`skill-tab-btn ${skillFilter === 'unverified' ? 'active' : ''}`}
                onClick={() => setSkillFilter('unverified')}
              >
                Resume Claims <span className="badge">{unverifiedSkills.length}</span>
              </button>
            </div>
          </div>
        </div>

        {displayedSkills.length > 0 ? (
          <div className="skill-cloud">
            {displayedSkills.map(skill => (
              <span className={`intel-skill ${skill.isVerified ? 'is-verified' : ''}`} key={skill.id} title={skill.isVerified ? 'Verified by credential document' : 'Self-reported on resume'}>
                {skill.isVerified && <i className="ph-fill ph-seal-check"></i>}
                {skill.name}
                <span className={`skill-confidence ${skill.isVerified ? 'verified-conf' : ''}`}>
                  {skill.isVerified ? `✓ ${skill.confidence}%` : `${skill.confidence}% claim`}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <i className="ph ph-sparkle"></i>
            <span>
              {skillFilter === 'verified'
                ? 'No verified skills yet. Upload a certificate or course credential above to corroborate your skills!'
                : skillFilter === 'unverified'
                ? 'All of your extracted skills have been verified!'
                : 'Your extracted skills will appear here after resume analysis.'}
            </span>
          </div>
        )}
      </section>

      {/* Recommended Internships Card */}
      <section className="resume-card matches-card">
        <div className="matches-header">
          <div>
            <h2>Recommended Internships</h2>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              Ranked by matching your verified & resume skills against opportunity requirements. Verified skills provide higher weighting.
            </p>
          </div>
          {matches.length > 0 && <span className="count-label" style={{ fontWeight: 700, color: '#0F172A' }}>Top {matches.length} Matches</span>}
        </div>
        {matches.length > 0 ? (
          <div className="match-list">
            {matches.slice(0, 6).map(match => (
              <article className="match-item" key={match.id}>
                <div className="match-main">
                  <div>
                    <div className="match-title">{match.title}</div>
                    <div className="match-company">{match.company} · {match.type || 'Internship'}</div>
                  </div>
                  <div className="match-score">{match.score}%</div>
                </div>
                {match.location && <div className="match-location"><i className="ph ph-map-pin"></i> {match.location}</div>}
                {(match.matched.length > 0 || match.missing.length > 0) && (
                  <div className="match-skills">
                    {match.matched.slice(0, 8).map((skill, index) => {
                      const sName = typeof skill === 'string' ? skill : skill.skill_name || skill.skill || skill.name;
                      const isV = verifiedSkills.some(vs => vs.name.toLowerCase() === sName.toLowerCase());
                      return (
                        <span className={`match-skill ${isV ? 'verified-match' : ''}`} key={`matched-${index}`} title={isV ? 'Verified skill' : 'Resume skill'}>
                          {isV ? '★ ' : '✓ '}{sName}{isV ? ' (Verified)' : ''}
                        </span>
                      );
                    })}
                    {match.missing.slice(0, 5).map((skill, index) => (
                      <span className="match-skill missing" key={`missing-${index}`}>
                        Missing · {typeof skill === 'string' ? skill : skill.skill_name || skill.skill || skill.name}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <i className="ph ph-briefcase"></i>
            <span>Once your resume is analyzed, your best internship matches will appear here.</span>
          </div>
        )}
      </section>
    </main>
  );
}
