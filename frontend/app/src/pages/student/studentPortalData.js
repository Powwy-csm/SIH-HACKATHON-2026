import { mockData } from '../../data/mockData';

export const student = mockData.students[0];

export const studentProfile = {
  name: student.full_name,
  firstName: student.full_name.split(' ')[0],
  degree: 'B.E. Computer Science and Engineering',
  college: 'SSN College of Engineering',
  headline: 'B.E. Computer Science - SSN College of Engineering',
  status: 'Open to internships',
  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name)}&background=DBEAFE&color=2563EB&size=120&bold=true`,
  about: 'Computer Science student passionate about Artificial Intelligence and Data Analytics. Experienced in building scalable web applications and deploying machine learning models. Looking for an internship to apply my technical skills to real-world industry problems.',
  education: {
    institution: 'SSN College of Engineering',
    period: '2023 - 2027',
    cgpa: student.cgpa,
  },
};

export const progressMetrics = [
  { label: 'Profile Completion', value: '84%', progress: 84 },
  { label: 'Industry Readiness', value: '72%', progress: 72 },
  { label: 'Skills Assessed', value: '18 / 24', progress: 75 },
  { label: 'Portfolio Strength', value: '78%', progress: 78 },
];

export const skills = [
  { name: 'Python', score: 85, verified: true },
  { name: 'SQL', score: 74, verified: true },
  { name: 'React', score: 62, verified: false },
  { name: 'Machine Learning', score: 56, verified: false },
  { name: 'Cloud / AWS', score: 38, verified: false, attention: true },
];

export const recommendedOpportunities = [
  {
    title: 'AI Engineering Intern',
    company: 'ABC Technologies',
    match: '92% Match',
    tags: ['Python', 'Machine Learning', 'SQL'],
    details: ['4 weeks', 'Rs. 15,000/mo'],
    action: 'View Opportunity',
  },
  {
    title: 'Data Analytics Internship',
    company: 'TechCorp',
    match: '86% Match',
    tags: ['SQL', 'Python', 'Power BI'],
    details: ['8 weeks', 'Remote'],
    action: 'View Opportunity',
  },
  {
    title: 'AI & Cloud Workshop',
    company: 'XYZ Labs - Online',
    match: 'Recommended Event',
    tags: ['AWS', 'MLOps', 'Deployment'],
    details: ['Aug 28, 2026'],
    action: 'Register Now',
    event: true,
  },
];

export const opportunityList = [
  {
    title: 'Machine Learning Intern',
    company: 'Global Tech Solutions',
    type: 'Internship',
    location: 'Remote',
    duration: '3 Months',
    tags: ['Python', 'TensorFlow', 'SQL'],
    match: '88% Match',
    missing: 'Missing: TensorFlow',
  },
  {
    title: 'Backend Developer Intern',
    company: 'Startup Inc.',
    type: 'Internship',
    location: 'Bengaluru / Hybrid',
    duration: '6 Months',
    tags: ['JavaScript', 'Node.js', 'MongoDB'],
    match: '65% Match',
  },
  {
    title: 'Frontend Developer Intern',
    company: 'XYZ Labs',
    type: 'Internship',
    location: 'Chennai',
    duration: '8 Weeks',
    tags: ['React', 'CSS', 'Chart.js'],
    match: '81% Match',
  },
];

export const careerPaths = [
  {
    title: 'AI Engineer',
    alignment: '91% alignment',
    strong: 'Python, ML, SQL',
    improve: 'Model Deployment, Cloud',
  },
  {
    title: 'Data Scientist',
    alignment: '84% alignment',
    strong: 'Python, SQL, Analytics',
    improve: 'Big Data, R',
  },
  {
    title: 'Full Stack Developer',
    alignment: '78% alignment',
    strong: 'React, SQL, APIs',
    improve: 'Node.js, Testing',
  },
];

export const applications = [
  { role: 'AI Engineer Intern', company: 'ABC Tech', date: 'Applied Aug 21', status: 'Shortlisted', tone: 'status-success' },
  { role: 'Data Analyst Intern', company: 'TechCorp', date: 'Applied Aug 18', status: 'Under Review', tone: 'status-neutral' },
  { role: 'Frontend Intern', company: 'XYZ Labs', date: 'Applied Aug 12', status: 'Interview', tone: 'status-blue' },
];

export const projects = [
  {
    title: 'AI Study Assistant',
    date: 'Jan 2026 - Present',
    description: 'Built a full-stack application using React and Python that generates custom study schedules and quizzes using NLP. Used by 200+ students on campus.',
    tags: ['React', 'Python', 'OpenAI API'],
  },
  {
    title: 'E-commerce Analytics Dashboard',
    date: 'Oct 2025 - Dec 2025',
    description: 'Created a dashboard visualizing sales data trends. Implemented data cleaning pipelines using Pandas and interactive charts using Chart.js.',
    tags: ['Pandas', 'SQL', 'JavaScript'],
  },
  {
    title: 'Campus Placement Tracker',
    date: 'Jun 2025 - Aug 2025',
    description: 'Designed a placement-readiness dashboard for students to track applications, skill gaps, and interview rounds.',
    tags: ['React', 'Chart.js', 'UX'],
  },
];

export const certifications = [
  { title: 'Google AI Professional', issuer: 'Coursera', date: 'Issued Jun 2026' },
  { title: 'IBM Generative AI', issuer: 'Coursera', date: 'Issued Mar 2026' },
  { title: 'AWS Cloud Practitioner Essentials', issuer: 'AWS Skill Builder', date: 'Issued Jan 2026' },
];

export const careerInterests = ['AI / Machine Learning Engineer', 'Data Analyst', 'Backend Developer'];

export const learningTracks = [
  { title: 'AWS for ML Deployment', progress: 38, lessons: '6 of 16 lessons', focus: 'Cloud / AWS' },
  { title: 'TensorFlow Fundamentals', progress: 55, lessons: '9 of 18 lessons', focus: 'Machine Learning' },
  { title: 'Backend API Design', progress: 68, lessons: '11 of 14 lessons', focus: 'Node.js' },
];

export const events = [
  { title: 'AI & Cloud Workshop', host: 'XYZ Labs', date: 'Aug 28, 2026', mode: 'Online', status: 'Registered' },
  { title: 'Campus Hiring Prep Day', host: 'SSN Placement Cell', date: 'Sep 4, 2026', mode: 'Auditorium', status: 'Open' },
  { title: 'Data Careers Industry Panel', host: 'BridgeX', date: 'Sep 12, 2026', mode: 'Hybrid', status: 'Open' },
];

export const roadmapSteps = [
  { title: 'Complete Cloud Basics', detail: 'Finish AWS learning track and upload one deployment project.', status: 'In progress' },
  { title: 'Strengthen ML Portfolio', detail: 'Add model evaluation notes and public demo links to two projects.', status: 'Next' },
  { title: 'Apply to Matched Internships', detail: 'Prioritize roles above 80% match and close missing skills.', status: 'Next' },
  { title: 'Interview Readiness', detail: 'Practice API design, ML basics, and project storytelling.', status: 'Planned' },
];
