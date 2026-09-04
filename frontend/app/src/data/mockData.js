export const mockData = {
    // Current active session user
    currentUser: {
        id: "inst-admin-123",
        role: "institution_admin",
        full_name: "Dr. Priya Menon",
        email: "priya.menon@ssn.edu.in",
        avatar_url: "https://ui-avatars.com/api/?name=Priya+Menon&background=EFF6FF&color=1D4ED8&bold=true"
    },
    
    // Institution Profile
    institution: {
        id: "inst-ssn-001",
        name: "SSN College of Engineering",
        domain_id: "dom-cse-1",
        accreditation_grade: "NAAC A++",
        logo_url: "SSN",
        website: "https://www.ssn.edu.in"
    },

    // Students matching your UI
    students: [
        {
            id: "stu-001",
            full_name: "Aarav Sharma",
            enrollment_number: "23CS012",
            branch: "CSE",
            year_of_study: 3,
            cgpa: 8.8,
            readiness_score: 92, // Mocked aggregation for UI
            aptitude_score: 94
        },
        {
            id: "stu-002",
            full_name: "Priya Nair",
            enrollment_number: "23IT045",
            branch: "IT",
            year_of_study: 3,
            cgpa: 8.4,
            readiness_score: 85,
            aptitude_score: 88
        },
        {
            id: "stu-003",
            full_name: "Rahul Verma",
            enrollment_number: "23CS089",
            branch: "CSE",
            year_of_study: 3,
            cgpa: 7.2,
            readiness_score: 64,
            aptitude_score: 71
        }
    ],

    // student_skills mapping
    studentSkills: [
        { student_id: "stu-001", skill_name: "Python", proficiency: "expert", proficiency_score: 94 },
        { student_id: "stu-001", skill_name: "SQL", proficiency: "advanced", proficiency_score: 88 },
        { student_id: "stu-001", skill_name: "Machine Learning", proficiency: "advanced", proficiency_score: 92 },
        { student_id: "stu-001", skill_name: "React", proficiency: "advanced", proficiency_score: 84 },
        
        { student_id: "stu-002", skill_name: "React", proficiency: "advanced", proficiency_score: 85 },
        { student_id: "stu-002", skill_name: "Node.js", proficiency: "intermediate", proficiency_score: 78 },
        { student_id: "stu-002", skill_name: "AWS Cloud", proficiency: "beginner", proficiency_score: 45 },
        
        { student_id: "stu-003", skill_name: "Java", proficiency: "intermediate", proficiency_score: 70 },
        { student_id: "stu-003", skill_name: "C++", proficiency: "intermediate", proficiency_score: 65 }
    ],

    // AI computed skill gaps
    skillGaps: [
        { student_id: "stu-001", target_role: "Cloud Architect", skill_name: "AWS", gap: 28 },
        { student_id: "stu-002", target_role: "AI Engineer", skill_name: "Python", gap: 35 },
        { student_id: "stu-003", target_role: "Full Stack", skill_name: "React", gap: 40 }
    ],

    // ---- Added for Student Readiness / Industry Demand / Profile views ----
    // Kept as separate top-level keys (not merged into `students` or
    // `studentSkills` above) so nothing existing changes shape.

    priorityGaps: [
        { skill: 'Cloud / AWS', gapPercent: 28, proficiency: 72, severity: 'danger' },
        { skill: 'AI / ML', gapPercent: 18, proficiency: 82, severity: 'warning' },
        { skill: 'SQL & Data', gapPercent: 16, proficiency: 84, severity: 'warning' },
    ],

    industryDemand: [
        { skill: 'Cloud Architecture', growth: 31 },
        { skill: 'AI / ML', growth: 28 },
        { skill: 'Python', growth: 24 },
    ],

    demandStats: [
        { label: 'Fastest Growing Demand', value: 'Cloud & AWS', trend: '↑ 31% Growth' },
        { label: 'Most In-Demand Role', value: 'GenAI / ML Engineer', trend: '↑ 28% Requests' },
        { label: 'Core Baseline Skill', value: 'Python & SQL', trend: '86% Requisite' },
    ],

    skillMapping: [
        {
            domain: 'Cloud Computing (AWS/GCP)',
            demand: 76,
            proficiency: 48,
            gap: 28,
            recommendation: 'Organize AWS Cloud Fundamentals Certification',
            status: 'Batch Scheduled',
            statusColor: 'warning',
        },
        {
            domain: 'Applied Machine Learning & GenAI',
            demand: 71,
            proficiency: 59,
            gap: 12,
            recommendation: 'Launch Hands-on PyTorch & LLM Lab',
            status: 'Ongoing',
            statusColor: 'success',
        },
        {
            domain: 'Data Engineering & SQL',
            demand: 68,
            proficiency: 52,
            gap: 16,
            recommendation: 'Schedule BigData Schema & Analytics Bootcamp',
            status: 'Curriculum Revised',
            statusColor: 'blue',
        },
        {
            domain: 'Full-Stack Web (React/Node)',
            demand: 64,
            proficiency: 61,
            gap: 3,
            recommendation: 'Continue Capstone Industry Mentorships',
            status: 'Optimal',
            statusColor: 'success',
            aligned: true,
        },
    ],

    accreditations: [
        { name: 'NAAC Accreditation', grade: 'Grade A++ (3.72/4.0)' },
        { name: 'NIRF 2025 Ranking', grade: 'Rank #45 (Engineering)' },
        { name: 'NBA Accreditation', grade: 'Tier-1 Validated' },
        { name: 'QS Asia University Band', grade: 'Top 250' },
    ],

    mouPartners: [
        { name: 'ABC Technologies', period: 'MoU Active • 2024–2027', initials: 'ABC', color: 'blue' },
        { name: 'TechCorp Global', period: 'MoU Active • 2023–2026', initials: 'TC', color: 'cyan' },
        { name: 'XYZ Research Labs', period: 'MoU Active • 2025–2028', initials: 'XYZ', color: 'purple' },
    ],

    placementContact: {
        officer: 'Dr. Rajesh Kumar (Placement Officer)',
        email: 'placement@ssn.edu.in',
        phone: '+91 44 2746 9700 / Ext 142',
        address: 'Rajiv Gandhi Salai (OMR), Kalavakkam, Chennai 603110',
    },

    // Full portfolio detail shown in the modal, keyed by student.id
    // (matches the "stu-001" style ids already used in `students` above).
    portfolios: {
        "stu-001": {
            dept: 'B.E. Computer Science • 3rd Year',
            initials: 'AS',
            verifiedSkills: [
                'Python (Advanced 94%)',
                'SQL & Relational DBs (88%)',
                'Machine Learning (92%)',
                'React & JavaScript (84%)',
            ],
            certifications: [
                { title: 'AWS Certified Cloud Practitioner (CLF-C02)', meta: 'Amazon Web Services • Credential ID: AWS-849204' },
                { title: 'Deep Learning Specialization (DeepLearning.AI)', meta: 'Coursera Verified • Completed: Jan 2026' },
            ],
            experience: [
                { title: 'AI-Driven Clinical Triage Assistant', detail: 'Built with PyTorch, FastAPI, and Next.js • 94% diagnostic accuracy', tag: 'Won 1st Place at Smart India Hackathon internal round' },
                { title: 'Summer Intern • Cloud Solutions', detail: 'ABC Technologies • 8 Weeks • Built automated ETL pipeline', tag: 'Rating: 4.9/5 by Industry Mentor' },
            ],
        },
    },
};