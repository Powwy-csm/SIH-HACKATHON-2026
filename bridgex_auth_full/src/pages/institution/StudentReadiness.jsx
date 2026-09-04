import React, { useState, useMemo } from 'react';
import { mockData } from '../../data/mockData';
import PortfolioModal from '../../components/modals/PortfolioModal';

// Joins the normalized studentSkills / skillGaps tables onto each
// student by student_id — mirrors how this will work once these come
// from real Supabase queries instead of mock arrays.
function buildStudentRows() {
    return mockData.students.map(student => {
        const skills = mockData.studentSkills
            .filter(s => s.student_id === student.id)
            .map(s => s.skill_name);

        const gaps = mockData.skillGaps
            .filter(g => g.student_id === student.id)
            .map(g => g.skill_name);

        return {
            ...student,
            skills,
            gapSkills: gaps,
            initials: student.full_name.split(' ').map(w => w[0]).join('').toUpperCase(),
        };
    });
}

export default function StudentReadiness() {

    const [search, setSearch] = useState('');
    const [dept, setDept] = useState('All Departments');
    const [year, setYear] = useState('All Years');
    const [status, setStatus] = useState('All Readiness Status');
    const [portfolioStudentId, setPortfolioStudentId] = useState(null);

    const studentRows = useMemo(buildStudentRows, []);

    const filteredStudents = useMemo(() => {
        const query = search.toLowerCase().trim();

        return studentRows.filter(student => {
            const rowText = `${student.full_name} ${student.enrollment_number} ${student.branch} ${student.skills.join(' ')}`.toLowerCase();

            const matchesQuery = !query || rowText.includes(query);
            const matchesDept = dept === 'All Departments' || student.branch.toUpperCase() === dept.toUpperCase();
            const matchesYear = year === 'All Years' || `${student.year_of_study}${ordinalSuffix(student.year_of_study)} Year` === year;

            let matchesStatus = true;
            if (status === 'Placement Ready') matchesStatus = student.readiness_score >= 80;
            if (status === 'Needs Upskilling') matchesStatus = student.readiness_score < 80;

            return matchesQuery && matchesDept && matchesYear && matchesStatus;
        });
    }, [studentRows, search, dept, year, status]);

    return (
        <main className="view-section active">

            <div className="dashboard-header">
                <div>
                    <h2>Student Skill Development &amp; Industry Readiness</h2>
                    <p className="subtitle">
                        Maintain student skill profiles, track aptitude assessment results, and review verified digital portfolios.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => alert('Exporting Student Skill Registry...')}>
                    <i className="ph ph-download-simple"></i> Export Skill Registry
                </button>
            </div>

            <div className="card p-24 mb-24">
                <div className="filter-bar">
                    <div className="search-bar" style={{ width: '320px' }}>
                        <i className="ph ph-magnifying-glass"></i>
                        <input
                            type="text"
                            placeholder="Search by name, roll no, or skill..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="filters">
                        <select className="form-select" value={dept} onChange={(e) => setDept(e.target.value)}>
                            <option>All Departments</option>
                            <option>CSE</option>
                            <option>IT</option>
                            <option>ECE</option>
                        </select>
                        <select className="form-select" value={year} onChange={(e) => setYear(e.target.value)}>
                            <option>All Years</option>
                            <option>3rd Year</option>
                            <option>4th Year</option>
                        </select>
                        <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option>All Readiness Status</option>
                            <option>Placement Ready</option>
                            <option>Needs Upskilling</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Dept &amp; Year</th>
                                <th>Verified Technical Skills</th>
                                <th>Aptitude / Soft Skills</th>
                                <th>Industry Readiness</th>
                                <th>Digital Portfolio</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(student => (
                                <tr key={student.id}>
                                    <td>
                                        <div className="table-user">
                                            <div className="avatar-sm bg-blue-light text-blue">{student.initials}</div>
                                            <div>
                                                <span className="font-semibold">{student.full_name}</span>
                                                <span className="sub-text">
                                                    Roll: {student.enrollment_number} • SSN {student.branch}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{student.branch} • {student.year_of_study}{ordinalSuffix(student.year_of_study)} Year</td>
                                    <td>
                                        <div className="tags">
                                            {student.skills.length > 0 ? (
                                                student.skills.map(skill => (
                                                    <span className="tag" key={skill}>{skill}</span>
                                                ))
                                            ) : (
                                                <span className="text-muted" style={{ fontSize: '12.5px' }}>No verified skills yet</span>
                                            )}
                                        </div>
                                        {/* The USP: Exposing the Gap */}
                                        {student.gapSkills.length > 0 && (
                                            <div className="skill-gap">
                                                <i className="ph-fill ph-warning-circle"></i> Deficit: {student.gapSkills.join(', ')}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge-status ${student.readiness_score >= 80 ? 'bg-success-light text-success' : 'bg-blue-light text-blue'}`}>
                                            {student.aptitude_score}% Aptitude
                                        </span>
                                    </td>
                                    <td>
                                        <div className="readiness-cell">
                                            <span className="font-semibold">{student.readiness_score}%</span>
                                            <div className="mini-progress">
                                                <div
                                                    className={`fill ${student.readiness_score >= 80 ? 'bg-success' : 'bg-warning'}`}
                                                    style={{ width: `${student.readiness_score}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <button className="btn btn-outline" onClick={() => setPortfolioStudentId(student.id)}>
                                            <i className="ph ph-eye"></i> View Portfolio
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center text-muted" style={{ padding: '32px' }}>
                                        No students match the current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {portfolioStudentId !== null && (
                <PortfolioModal
                    studentId={portfolioStudentId}
                    onClose={() => setPortfolioStudentId(null)}
                />
            )}

        </main>
    );
}

function ordinalSuffix(n) {
    if (n === 1) return 'st';
    if (n === 2) return 'nd';
    if (n === 3) return 'rd';
    return 'th';
}
