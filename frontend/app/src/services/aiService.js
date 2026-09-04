// Simulating the Python FastAPI endpoints
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const aiService = {
    getSkillGaps: async (studentId, targetRole) => {
        await delay(800); // AI operations take time
        return {
            status: "success",
            data: { missing_skills: [{ skill: "Cloud Architecture", gap: 28 }] }
        };
    },

    getOpportunityMatch: async (studentId, opportunityId) => {
        await delay(1200);
        return { match_score: 85, reason: "Strong alignment in Python and SQL." };
    }
};