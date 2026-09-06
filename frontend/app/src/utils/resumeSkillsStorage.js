/**
 * Utility for persisting and retrieving analyzed resume skills in browser localStorage.
 *
 * Rules:
 * 1. Extracted skills and analysis status are saved locally once an analysis completes.
 * 2. On page load / refresh / navigation / reopen, skills are read directly from localStorage.
 * 3. No repeated backend AI requests are sent when saved skills exist for the resume.
 * 4. Scoped by student and identifies the specific resume (resumeId, fileName).
 */

const STORAGE_PREFIX = 'bridgex_resume_analysis';

function getStorageKey(studentId) {
  return `${STORAGE_PREFIX}_${studentId || 'default'}`;
}

/**
 * Retrieve saved resume analysis for a student.
 * @param {string} studentId
 * @param {string} [targetResumeId] - Optional specific resume ID to match
 * @returns {{ resumeId: string, fileName: string, fileSize: number, status: string, skills: Array, matches: Array, analyzedAt: string } | null}
 */
export function getSavedResumeAnalysis(studentId, targetResumeId = null) {
  if (!studentId && typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getStorageKey(studentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.skills)) return null;

    // If a specific resumeId was requested, verify match
    if (targetResumeId && parsed.resumeId && parsed.resumeId !== targetResumeId) {
      // Also check if there is an indexed entry for this resumeId
      const indexedRaw = localStorage.getItem(`${getStorageKey(studentId)}_${targetResumeId}`);
      if (indexedRaw) {
        return JSON.parse(indexedRaw);
      }
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn('Failed to parse saved resume analysis from localStorage:', err);
    return null;
  }
}

/**
 * Save resume analysis result into localStorage.
 * @param {string} studentId
 * @param {Object} payload
 */
export function saveResumeAnalysis(studentId, payload) {
  if (!studentId || !payload) return;
  try {
    const dataToSave = {
      resumeId: payload.resumeId || payload.id || null,
      fileName: payload.fileName || payload.file_name || 'resume.pdf',
      fileSize: payload.fileSize || payload.file_size || 0,
      status: payload.status || 'completed',
      skills: Array.isArray(payload.skills) ? payload.skills : [],
      matches: Array.isArray(payload.matches) ? payload.matches : [],
      analyzedAt: payload.analyzedAt || new Date().toISOString(),
    };

    const key = getStorageKey(studentId);
    localStorage.setItem(key, JSON.stringify(dataToSave));

    // Also index by resumeId if available for multi-resume lookup
    if (dataToSave.resumeId) {
      localStorage.setItem(`${key}_${dataToSave.resumeId}`, JSON.stringify(dataToSave));
    }
  } catch (err) {
    console.warn('Failed to save resume analysis to localStorage:', err);
  }
}

/**
 * Clear saved analysis when resume is deleted or student cleans state.
 * @param {string} studentId
 * @param {string} [resumeId]
 */
export function clearResumeAnalysis(studentId, resumeId = null) {
  if (!studentId) return;
  try {
    const key = getStorageKey(studentId);
    if (resumeId) {
      localStorage.removeItem(`${key}_${resumeId}`);
      // If the active one matches this resumeId, remove it too
      const current = getSavedResumeAnalysis(studentId);
      if (current?.resumeId === resumeId) {
        localStorage.removeItem(key);
      }
    } else {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn('Failed to clear resume analysis from localStorage:', err);
  }
}

/**
 * Check if a resume has already been analyzed and exists in localStorage.
 * @param {string} studentId
 * @param {string} [resumeId]
 * @param {string} [fileName]
 * @returns {boolean}
 */
export function isResumeAnalyzed(studentId, resumeId, fileName = null) {
  const saved = getSavedResumeAnalysis(studentId, resumeId);
  if (!saved || !saved.skills || saved.skills.length === 0) return false;
  if (resumeId && saved.resumeId === resumeId) return true;
  if (fileName && saved.fileName === fileName) return true;
  return Boolean(saved.status === 'completed' && saved.skills.length > 0);
}
