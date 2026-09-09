import { apiClient } from '../services/apiClient';

const CACHE_PREFIX = 'student-skills-cache:';
const PROFILE_CACHE_PREFIX = 'student-profile-cache:';
const CACHE_TTL_MS = 60 * 1000;
const memoryCache = new Map();
const profileRequests = new Map();

const clamp = value => Math.max(0, Math.min(100, value));

function toScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return clamp(number <= 1 ? number * 100 : number);
}

export function calculateClaimConfidence(skill) {
  if (!skill) return 40;

  const isVerified = Boolean(
    skill.is_verified ||
    skill.isVerified ||
    skill.status === 'verified' ||
    skill.source === 'document_verified' ||
    skill.source === 'certificate' ||
    skill.source === 'institution_verified' ||
    skill.source === 'corroboration' ||
    (Number(skill.evidence_score || skill.evidenceScore) > 0) ||
    Boolean(skill.evidence_url || skill.evidenceUrl)
  );

  if (isVerified) {
    return 90;
  }

  const source = (skill.source || '').toLowerCase();
  const isFromResume = Boolean(
    skill.is_from_resume ||
    skill.isFromResume ||
    source === 'resume' ||
    source === 'resume_extraction' ||
    source === 'ai_estimated' ||
    source === 'extracted' ||
    source === 'resume_intelligence'
  );

  if (isFromResume) {
    return 55;
  }

  // Self-reported / initial skills / default
  const prof = (skill.proficiency || '').toLowerCase();
  const profScore = Number(skill.proficiency_score ?? skill.proficiencyScore);

  if (prof === 'beginner' || prof === 'novice' || prof === 'basic' || (Number.isFinite(profScore) && profScore <= 35 && profScore > 0)) {
    return 25;
  }
  if (prof === 'advanced' || prof === 'expert' || (Number.isFinite(profScore) && profScore > 65)) {
    return 50;
  }
  return 40; // intermediate / default
}

export function normalizeStudentSkills(payload) {
  const data = payload?.data && typeof payload.data === 'object'
    ? payload.data
    : payload;
  const skills = Array.isArray(data?.skills) ? data.skills : [];

  return skills.map(skill => {
    const isVerified = Boolean(
      skill.is_verified ||
      skill.isVerified ||
      skill.status === 'verified' ||
      skill.source === 'document_verified' ||
      skill.source === 'certificate'
    );
    const confidence = calculateClaimConfidence(skill);

    return {
      id: skill.skill_id || skill.id,
      name: skill.skill_name || skill.name || 'Unknown skill',
      proficiency: skill.proficiency || 'beginner',
      confidence: confidence,
      selfReportScore: toScore(skill.self_report_score),
      assessmentScore: toScore(skill.assessment_score),
      evidenceScore: toScore(skill.evidence_score),
      source: skill.source || null,
      isVerified: isVerified || confidence >= 90,
      evidenceUrl: skill.evidence_url || null,
    };
  }).filter(skill => skill.id && skill.name !== 'Unknown skill');
}

export async function fetchStudentSkills(studentId) {
  return fetchStudentSkillsWithOptions({ studentId });
}

function readCachedStudentSkills(studentId) {
  if (!studentId) return null;

  const memoryEntry = memoryCache.get(studentId);
  if (memoryEntry && Date.now() - memoryEntry.timestamp < CACHE_TTL_MS) {
    return memoryEntry.skills;
  }

  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${studentId}`);
    const entry = raw ? JSON.parse(raw) : null;
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS && Array.isArray(entry.skills)) {
      memoryCache.set(studentId, entry);
      return entry.skills;
    }
  } catch {
    // A cache read must never block the authoritative request.
  }

  return null;
}

function writeCachedStudentSkills(studentId, skills) {
  if (!studentId) return;

  const entry = { timestamp: Date.now(), skills };
  memoryCache.set(studentId, entry);
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${studentId}`, JSON.stringify(entry));
  } catch {
    // Storage can be unavailable or full; memory caching still applies.
  }
}

export function getCachedStudentSkills(studentId) {
  return readCachedStudentSkills(studentId) || [];
}

export async function fetchStudentSkillsWithOptions({ studentId, forceRefresh = false } = {}) {
  const profile = await fetchStudentProfile({ studentId, forceRefresh });
  const skills = normalizeStudentSkills(profile);
  writeCachedStudentSkills(studentId, skills);
  return skills;
}

function readCachedProfile(studentId) {
  if (!studentId) return null;
  try {
    const raw = sessionStorage.getItem(`${PROFILE_CACHE_PREFIX}${studentId}`);
    const entry = raw ? JSON.parse(raw) : null;
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.profile;
    }
  } catch {
    // A cache read must never block the authoritative request.
  }
  return null;
}

function writeCachedProfile(studentId, profile) {
  if (!studentId) return;
  try {
    sessionStorage.setItem(
      `${PROFILE_CACHE_PREFIX}${studentId}`,
      JSON.stringify({ timestamp: Date.now(), profile })
    );
  } catch {
    // The in-flight request still succeeds if browser storage is unavailable.
  }
}

export async function fetchStudentProfile({ studentId, forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = readCachedProfile(studentId);
    if (cached) return cached;
  }

  if (!forceRefresh && studentId && profileRequests.has(studentId)) {
    return profileRequests.get(studentId);
  }

  const request = apiClient('/api/student/profile').then(response => {
    if (!response.ok) {
      throw new Error(response.error || 'Unable to load student profile.');
    }
    const profile = response.data;
    writeCachedProfile(studentId, profile);
    return profile;
  });

  if (studentId) {
    profileRequests.set(studentId, request);
    request.then(
      () => profileRequests.delete(studentId),
      () => profileRequests.delete(studentId)
    );
  }

  return request;
}

export function clearStudentProfileCache(studentId) {
  if (!studentId) return;
  try {
    sessionStorage.removeItem(`${PROFILE_CACHE_PREFIX}${studentId}`);
    sessionStorage.removeItem(`${CACHE_PREFIX}${studentId}`);
  } catch {
    // Cache invalidation is best effort.
  }
}

export function getSkillSourceLabel(skill) {
  if (skill.isVerified) return 'Verified';

  const source = String(skill.source || '').toLowerCase();
  const hasAssessment = (skill.assessmentScore || 0) > 0 || source.includes('assess');
  const hasEvidence = (skill.evidenceScore || 0) > 0 || source.includes('evidence') || source.includes('certificate');

  if (hasEvidence && hasAssessment) return 'Evidence + Assessment';
  if (hasAssessment && skill.selfReportScore !== null) return 'Assessment + Self-report';
  if (hasEvidence) return 'Evidence';
  if (hasAssessment) return 'Assessment';
  return 'Self-reported';
}
