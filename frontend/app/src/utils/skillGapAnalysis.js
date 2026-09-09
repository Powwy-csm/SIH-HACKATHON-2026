/**
 * skillGapAnalysis.js
 *
 * Real, dynamic, opportunity-driven skill gap analysis for students.
 * Extracts demanded skills from live industry postings and compares
 * them against the student's real skills from the database.
 */

const COMMON_ALIASES = {
  'js': 'javascript',
  'ts': 'typescript',
  'postgres': 'postgresql',
  'reactjs': 'react',
  'react.js': 'react',
  'react js': 'react',
  'nodejs': 'node.js',
  'node': 'node.js',
  'node js': 'node.js',
  'vuejs': 'vue',
  'vue.js': 'vue',
  'py': 'python',
  'golang': 'go',
  'k8s': 'kubernetes',
  'cpp': 'c++',
  'c#': 'csharp',
  'cs': 'csharp',
};

/**
 * Normalizes a skill string for consistent comparison (case-insensitive, trimmed, alias-mapped).
 */
export function normalizeSkillName(name) {
  if (!name || typeof name !== 'string') return '';
  const cleaned = name.trim().toLowerCase().replace(/\s+/g, ' ');
  return COMMON_ALIASES[cleaned] || cleaned;
}

/**
 * Calculates deterministic, real-time match percentage and missing skills
 * for an opportunity against the student's authentic skills.
 *
 * @param {Object} posting - Opportunity object containing skills_list or skills
 * @param {Array} studentSkills - Array of student skill objects from fetchStudentSkills
 * @returns {Object} { matchPercentage, matchText, missingText, matchedSkills, missingSkills, totalRequired, isGeneral }
 */
export function calculateOpportunityMatch(posting, studentSkills = []) {
  let rawSkills = posting?.skills_list || posting?.skills || [];
  if (typeof rawSkills === 'string') {
    rawSkills = rawSkills.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(rawSkills)) {
    rawSkills = [];
  }

  const requiredSkills = rawSkills.filter(s => s && typeof s === 'string' && s.trim().length > 0);

  if (requiredSkills.length === 0) {
    return {
      matchPercentage: null,
      matchText: 'Requirements not specified',
      missingText: null,
      matchedSkills: [],
      missingSkills: [],
      totalRequired: 0,
      isGeneral: true,
    };
  }

  const studentSkillSet = new Set();
  (studentSkills || []).forEach(sk => {
    const rawName = typeof sk === 'string' ? sk : (sk.name || sk.skill_name || sk.skill || '');
    const norm = normalizeSkillName(rawName);
    if (norm) {
      studentSkillSet.add(norm);
    }
  });

  if (studentSkillSet.size === 0) {
    return {
      matchPercentage: 0,
      matchText: '0% Match',
      missingText: `Missing: ${requiredSkills.slice(0, 2).join(', ')}`,
      matchedSkills: [],
      missingSkills: requiredSkills,
      totalRequired: requiredSkills.length,
      isGeneral: false,
    };
  }

  const matched = [];
  const missing = [];
  const seenRequired = new Set();

  requiredSkills.forEach(req => {
    const normReq = normalizeSkillName(req);
    if (seenRequired.has(normReq)) return;
    seenRequired.add(normReq);

    let isMatched = studentSkillSet.has(normReq);
    if (!isMatched) {
      for (const stSkill of studentSkillSet) {
        if (stSkill === normReq || stSkill.includes(normReq) || normReq.includes(stSkill)) {
          isMatched = true;
          break;
        }
      }
    }

    if (isMatched) {
      matched.push(req);
    } else {
      missing.push(req);
    }
  });

  const totalRequired = seenRequired.size;
  const matchPercentage = totalRequired > 0
    ? Math.round((matched.length / totalRequired) * 100)
    : null;

  return {
    matchPercentage,
    matchText: `${matchPercentage}% Match`,
    missingText: missing.length > 0 ? `Missing: ${missing.slice(0, 2).join(', ')}` : null,
    matchedSkills: matched,
    missingSkills: missing,
    totalRequired,
    isGeneral: false,
  };
}

/**
 * Clean display name formatter (preserves casing)
 */
function cleanDisplayName(name) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (trimmed === trimmed.toLowerCase()) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  return trimmed;
}

/**
 * Compute the dynamic skill gap from real opportunity postings and student skills.
 *
 * @param {Array} postings - Array of posting objects from /api/student/opportunities
 * @param {Array} studentSkills - Array of student skill objects from fetchStudentSkills
 * @returns {Object} Analysis result object
 */
export function computeOpportunitySkillGap(postings = [], studentSkills = []) {
  const postList = Array.isArray(postings) ? postings : [];
  const skillList = Array.isArray(studentSkills) ? studentSkills : [];

  if (postList.length === 0) {
    return {
      status: 'no_opportunities',
      message: 'No current opportunities to analyze skill demand.',
      totalOpportunities: 0,
      demandedSkills: [],
      missingSkills: [],
      matchedSkills: [],
      topDemandedSkill: null,
      mostDemandedMissingSkill: null,
    };
  }

  // 1. Extract required skills from all postings and aggregate demand count
  const skillDemandMap = new Map();

  for (const post of postList) {
    let rawSkills = post.skills_list || post.skills || [];
    if (typeof rawSkills === 'string') {
      rawSkills = rawSkills.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(rawSkills)) continue;

    // Deduplicate skills within the same posting
    const seenInThisPost = new Set();

    for (const raw of rawSkills) {
      if (!raw || typeof raw !== 'string') continue;
      const normalized = normalizeSkillName(raw);
      if (!normalized || seenInThisPost.has(normalized)) continue;

      seenInThisPost.add(normalized);

      if (!skillDemandMap.has(normalized)) {
        skillDemandMap.set(normalized, {
          name: cleanDisplayName(raw),
          normalizedName: normalized,
          count: 1,
        });
      } else {
        const entry = skillDemandMap.get(normalized);
        entry.count += 1;
        if (raw.length === entry.name.length && raw !== raw.toLowerCase() && entry.name === entry.name.toLowerCase()) {
          entry.name = cleanDisplayName(raw);
        }
      }
    }
  }

  if (skillDemandMap.size === 0) {
    return {
      status: 'no_skills_required',
      message: 'No skill requirements available yet.',
      totalOpportunities: postList.length,
      demandedSkills: [],
      missingSkills: [],
      matchedSkills: [],
      topDemandedSkill: null,
      mostDemandedMissingSkill: null,
    };
  }

  // 2. Build student skills set for quick lookup
  const studentSkillSet = new Set();
  for (const sk of skillList) {
    const rawName = sk.name || sk.skill_name || sk.raw_skill_name || '';
    const norm = normalizeSkillName(rawName);
    if (norm) studentSkillSet.add(norm);
  }

  // 3. Sort demanded skills by frequency descending
  const demandedSkills = Array.from(skillDemandMap.values()).map(item => {
    const hasSkill = studentSkillSet.has(item.normalizedName);
    return {
      ...item,
      hasSkill,
      percentage: postList.length > 0 ? Math.round((item.count / postList.length) * 100) : 0,
    };
  });

  demandedSkills.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const missingSkills = demandedSkills.filter(s => !s.hasSkill);
  const matchedSkills = demandedSkills.filter(s => s.hasSkill);

  const topDemandedSkill = demandedSkills.length > 0 ? demandedSkills[0] : null;
  const mostDemandedMissingSkill = missingSkills.length > 0 ? missingSkills[0] : null;

  if (missingSkills.length === 0) {
    return {
      status: 'all_matched',
      message: 'You currently match the required skills for the available opportunities.',
      totalOpportunities: postList.length,
      demandedSkills,
      missingSkills: [],
      matchedSkills,
      topDemandedSkill,
      mostDemandedMissingSkill: null,
    };
  }

  return {
    status: 'has_gaps',
    message: 'Skill gap analysis based on current opportunities.',
    totalOpportunities: postList.length,
    demandedSkills,
    missingSkills,
    matchedSkills,
    topDemandedSkill,
    mostDemandedMissingSkill,
  };
}
