/**
 * institutionService.js
 *
 * HTTP client functions for Institution-facing API endpoints.
 * All requests require a valid Supabase access token (Bearer JWT).
 *
 * Throws on non-2xx — callers must handle errors explicitly.
 * Never silently falls back to mock data.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Fetch all students with their skills and computed readiness score.
 * Single request — portfolio details are NOT included here.
 *
 * @param {string} accessToken - Supabase session access_token
 * @returns {Promise<Array>} Array of student objects
 */
export async function fetchInstitutionStudents(accessToken) {
    const res = await fetch(`${API_BASE}/api/institution/students`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            detail = body.detail || detail;
        } catch {
            // ignore parse error
        }
        throw new Error(`Failed to load students: ${detail}`);
    }

    const data = await res.json();
    return data.students || [];
}

/**
 * Fetch a single student's portfolio detail (projects, certifications, verified skills).
 * Called only when the institution user clicks "View Portfolio".
 *
 * @param {string} studentId - UUID of the student
 * @param {string} accessToken - Supabase session access_token
 * @returns {Promise<Object>} Portfolio object with student, verified_skills, certifications, projects
 */
export async function fetchStudentPortfolio(studentId, accessToken) {
    const res = await fetch(`${API_BASE}/api/institution/students/${encodeURIComponent(studentId)}/portfolio`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            detail = body.detail || detail;
        } catch {
            // ignore parse error
        }
        throw new Error(`Failed to load portfolio: ${detail}`);
    }

    return await res.json();
}

/**
 * Fetch live industry skill demand and gap statistics from real database postings.
 *
 * @param {string} accessToken - Supabase session access_token
 * @returns {Promise<Object>} Object with total_postings, total_students, skills, demandStats, skillMapping
 */
export async function fetchInstitutionSkillDemand(accessToken) {
    const res = await fetch(`${API_BASE}/api/institution/skill-demand`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            detail = body.detail || detail;
        } catch {
            // ignore parse error
        }
        throw new Error(`Failed to load skill demand: ${detail}`);
    }

    return await res.json();
}

/**
 * Fetch comprehensive skill mapping and deficit analysis from real database postings.
 *
 * @param {string} accessToken - Supabase session access_token
 * @returns {Promise<Object>} Object with demandStats and skillMapping array
 */
export async function fetchInstitutionSkillGap(accessToken) {
    const res = await fetch(`${API_BASE}/api/institution/skill-gap`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            detail = body.detail || detail;
        } catch {
            // ignore parse error
        }
        throw new Error(`Failed to load skill gap: ${detail}`);
    }

    return await res.json();
}

