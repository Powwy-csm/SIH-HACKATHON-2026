import { mockData } from '../data/mockData';

// Simulating Supabase SDK network delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const supabaseService = {
    // Auth
    getCurrentUser: async () => {
        await delay(300);
        return mockData.currentUser;
    },
    
    // Institution Data
    getInstitutionProfile: async () => {
        await delay(200);
        return mockData.institution;
    },

    // Student Data Aggregation
    getStudentsWithSkills: async () => {
        await delay(500);
        return mockData.students.map(student => {
            const skills = mockData.studentSkills.filter(s => s.student_id === student.id);
            const gaps = mockData.skillGaps.filter(g => g.student_id === student.id);
            return { ...student, skills, gaps };
        });
    }
};