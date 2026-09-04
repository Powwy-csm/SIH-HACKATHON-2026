import React, { useState, useMemo } from 'react';

const CANDIDATES = [
    {
        id: 1,
        name: 'Aarav Sharma',
        college: 'SSN College of Engineering • B.E. Computer Science',
        avatar: 'https://ui-avatars.com/api/?name=Aarav+Sharma&background=E2E8F0&color=172033',
        skills: ['Python', 'Machine Learning', 'SQL', 'React'],
        gap: 'Docker, Kubernetes',
        match: 92,
        dept: 'Computer Science',
        cgpa: '8.8',
        stats: '4 Projects • 2 Certifications',
    },
    {
        id: 2,
        name: 'Priya Nair',
        college: 'Madras Institute of Technology • B.Tech IT',
        avatar: 'https://ui-avatars.com/api/?name=Priya+Nair&background=E2E8F0&color=172033',
        skills: ['React', 'Node.js', 'AWS'],
        gap: 'Docker, Kubernetes',
        match: 88,
        dept: 'Information Technology',
        cgpa: '8.5',
        stats: '6 Projects • 1 Certification',
    },
    {
        id: 3,
        name: 'Rahul Verma',
        college: 'PSG College of Technology • Data Science',
        avatar: 'https://ui-avatars.com/api/?name=Rahul+Verma&background=E2E8F0&color=172033',
        skills: ['Python', 'SQL', 'PowerBI'],
        gap: 'Cloud / AWS',
        match: 84,
        dept: 'Data Science',
        cgpa: '8.2',
        stats: '3 Projects • 3 Certifications',
    },
    {
        id: 4,
        name: 'Divya Krishnan',
        college: 'SSN College of Engineering • B.E. ECE',
        avatar: 'https://ui-avatars.com/api/?name=Divya+Krishnan&background=E2E8F0&color=172033',
        skills: ['Python', 'Embedded Systems', 'IoT', 'C++'],
        gap: 'ROS, Cloud MQTT',
        match: 79,
        dept: 'Electronics',
        cgpa: '8.9',
        stats: '5 Projects • 2 Hackathons',
    },
    {
        id: 5,
        name: 'Karthik Raja',
        college: 'College of Engineering Guindy • B.E. CSE',
        avatar: 'https://ui-avatars.com/api/?name=Karthik+Raja&background=E2E8F0&color=172033',
        skills: ['Full-Stack', 'Go', 'Docker', 'PostgreSQL'],
        gap: 'Kubernetes CI/CD',
        match: 94,
        dept: 'Computer Science',
        cgpa: '9.1',
        stats: '7 Projects • Open Source Contributor',
    },
];

export default function IndustryTalent() {
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
    const [shortlisted, setShortlisted] = useState(new Set([1]));

    const filtered = useMemo(() => {
        return CANDIDATES.filter(c => {
            const matchesQuery = !search || 
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.skills.some(s => s.toLowerCase().includes(search.toLowerCase())) ||
                c.college.toLowerCase().includes(search.toLowerCase());
            const matchesDept = deptFilter === 'All' || c.dept.toLowerCase().includes(deptFilter.toLowerCase());
            return matchesQuery && matchesDept;
        });
    }, [search, deptFilter]);

    const toggleShortlist = (id) => {
        setShortlisted(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <main className="dashboard-area">
            <div className="dashboard-header">
                <div>
                    <h2>Talent Pool &amp; Candidate Discovery</h2>
                    <p className="subtitle">Search, filter, and shortlist verified engineering talent across partner campuses.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-outline" type="button" onClick={() => alert('Exporting candidate shortlist...')}>
                        <i className="ph ph-download-simple"></i> Export Shortlist
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <section className="card" style={{ padding: '20px 24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="search-bar" style={{ flex: '1 1 300px', width: 'auto' }}>
                        <i className="ph ph-magnifying-glass"></i>
                        <input
                            type="text"
                            placeholder="Search by candidate name, skill (Python, Docker, SQL)..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <select
                            className="form-control"
                            style={{ width: 'auto', borderRadius: '20px', padding: '8px 16px', background: 'var(--bg-light)', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                        >
                            <option value="All">All Departments</option>
                            <option value="Computer Science">Computer Science</option>
                            <option value="Information Technology">Information Technology</option>
                            <option value="Data Science">Data Science</option>
                            <option value="Electronics">Electronics</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Talent List */}
            <section className="card">
                <div className="card-header">
                    <div>
                        <h3>Candidate Matches ({filtered.length})</h3>
                        <p className="subtitle">AI-matched according to technical depth and verified portfolio scores.</p>
                    </div>
                </div>
                <div className="talent-list">
                    {filtered.map(cand => {
                        const isShortlisted = shortlisted.has(cand.id);
                        return (
                            <div className="talent-card" key={cand.id}>
                                <div className="talent-basic">
                                    <img src={cand.avatar} alt={cand.name} className="avatar-lg" />
                                    <div className="talent-info">
                                        <h4>{cand.name}</h4>
                                        <p className="college">{cand.college} • CGPA: {cand.cgpa}</p>
                                        <div className="skills-wrap">
                                            {cand.skills.map(s => (
                                                <span className="skill-pill" key={s}>{s}</span>
                                            ))}
                                        </div>
                                        {cand.gap && (
                                            <div className="skill-gap text-danger mt-8" style={{ fontSize: '12.5px', fontWeight: 600 }}>
                                                <i className="ph-fill ph-warning-circle"></i> Deficit Gap: {cand.gap}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="talent-meta">
                                    <div className="match-score">
                                        <div className="score-text"><span>{cand.match}%</span> Match</div>
                                        <div className="progress-bar">
                                            <div
                                                className={`progress-fill ${cand.match >= 90 ? 'excellent' : 'good'}`}
                                                style={{ width: `${cand.match}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="talent-stats">{cand.stats}</div>
                                    <div className="talent-actions">
                                        <button
                                            className="btn btn-outline"
                                            type="button"
                                            onClick={() => alert(`Previewing verified digital portfolio for ${cand.name}...`)}
                                        >
                                            View Portfolio
                                        </button>
                                        <button
                                            className={`btn btn-primary btn-shortlist ${isShortlisted ? 'shortlisted' : ''}`}
                                            type="button"
                                            onClick={() => toggleShortlist(cand.id)}
                                        >
                                            {isShortlisted ? (
                                                <>Shortlisted <i className="ph ph-check"></i></>
                                            ) : (
                                                'Shortlist'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No candidates found matching the selected search query or department.
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
