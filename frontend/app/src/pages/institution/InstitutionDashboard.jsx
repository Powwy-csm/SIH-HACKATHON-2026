import React from 'react';
import { mockData } from '../../data/mockData';

export default function InstitutionDashboard() {

    const students = mockData.students;

    const averageReadiness = Math.round(
        students.reduce((sum, student) => sum + student.readiness_score, 0) /
        students.length
    );

    return (
        <main className="view-section active">

            {/* =====================================================
                HEADER
            ===================================================== */}

            <div className="dashboard-header">

                <div>
                    <h2>Institution Overview</h2>

                    <p className="subtitle">
                        Monitor student readiness, industry demand and
                        academia-industry opportunities.
                    </p>
                </div>

                <button className="btn btn-primary">
                    <i className="ph ph-download-simple"></i>
                    Export Report
                </button>

            </div>


            {/* =====================================================
                TOP STATISTICS
            ===================================================== */}

            <div className="stats-grid">

                <div className="stat-card">

                    <div className="stat-icon">
                        <i className="ph ph-users-three"></i>
                    </div>

                    <div className="stat-info">
                        <span className="stat-value">
                            {students.length}
                        </span>

                        <span className="stat-label">
                            Students Assessed
                        </span>

                        <span className="stat-trend success">
                            <i className="ph ph-arrow-up-right"></i>
                            +18 this month
                        </span>
                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-icon">
                        <i className="ph ph-chart-line-up"></i>
                    </div>

                    <div className="stat-info">
                        <span className="stat-value">
                            {averageReadiness}%
                        </span>

                        <span className="stat-label">
                            Average Readiness
                        </span>

                        <span className="stat-trend success">
                            <i className="ph ph-arrow-up-right"></i>
                            +6% this semester
                        </span>
                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-icon">
                        <i className="ph ph-briefcase"></i>
                    </div>

                    <div className="stat-info">
                        <span className="stat-value">24</span>

                        <span className="stat-label">
                            Active Opportunities
                        </span>

                        <span className="stat-trend success">
                            <i className="ph ph-arrow-up-right"></i>
                            +5 this month
                        </span>
                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-icon">
                        <i className="ph ph-handshake"></i>
                    </div>

                    <div className="stat-info">
                        <span className="stat-value">8</span>

                        <span className="stat-label">
                            Industry Partnerships
                        </span>

                        <span className="stat-trend success">
                            <i className="ph ph-arrow-up-right"></i>
                            +2 this semester
                        </span>
                    </div>

                </div>

            </div>


            {/* =====================================================
                READINESS + SKILL DEMAND
            ===================================================== */}

            <div className="summary-grid">

                {/* Student Readiness */}

                <section className="card">

                    <div className="card-header">

                        <div>
                            <h3>Student Readiness</h3>

                            <p className="subtitle">
                                Overview of students based on their current
                                skill readiness.
                            </p>
                        </div>

                        <button className="btn btn-text">
                            View All
                            <i className="ph ph-arrow-right"></i>
                        </button>

                    </div>


                    <div className="gap-summary-list">

                        {students.map(student => (

                            <div
                                className="gap-sum-item"
                                key={student.id}
                            >

                                <div className="gap-sum-label">

                                    <div>
                                        <strong>
                                            {student.full_name}
                                        </strong>

                                        <span>
                                            {student.branch} • Year {
                                                student.year_of_study
                                            }
                                        </span>
                                    </div>

                                    <strong>
                                        {student.readiness_score}%
                                    </strong>

                                </div>

                                <div className="progress-bar">

                                    <div
                                        className="progress-fill"
                                        style={{
                                            width: `${student.readiness_score}%`
                                        }}
                                    ></div>

                                </div>

                            </div>

                        ))}

                    </div>

                </section>


                {/* Industry Demand */}

                <section className="card">

                    <div className="card-header">

                        <div>
                            <h3>Industry Demand & Skill Gaps</h3>

                            <p className="subtitle">
                                Skills frequently requested by industry.
                            </p>
                        </div>

                        <button className="btn btn-text">
                            Explore
                            <i className="ph ph-arrow-right"></i>
                        </button>

                    </div>


                    <div className="demand-summary-list">

                        <div className="demand-sum-item">

                            <div className="gap-sum-label">
                                <span>Python</span>
                                <strong>86%</strong>
                            </div>

                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: '86%' }}
                                ></div>
                            </div>

                        </div>


                        <div className="demand-sum-item">

                            <div className="gap-sum-label">
                                <span>Cloud Computing</span>
                                <strong>78%</strong>
                            </div>

                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: '78%' }}
                                ></div>
                            </div>

                        </div>


                        <div className="demand-sum-item">

                            <div className="gap-sum-label">
                                <span>Machine Learning</span>
                                <strong>74%</strong>
                            </div>

                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: '74%' }}
                                ></div>
                            </div>

                        </div>


                        <div className="demand-sum-item">

                            <div className="gap-sum-label">
                                <span>Communication</span>
                                <strong>69%</strong>
                            </div>

                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: '69%' }}
                                ></div>
                            </div>

                        </div>

                    </div>

                </section>

            </div>


            {/* =====================================================
                OPPORTUNITIES
            ===================================================== */}

            <section className="card mt-24">

                <div className="card-header">

                    <div>
                        <h3>Recent Industry Opportunities</h3>

                        <p className="subtitle">
                            Latest opportunities available to your students.
                        </p>
                    </div>

                    <button className="btn btn-text">
                        View All
                        <i className="ph ph-arrow-right"></i>
                    </button>

                </div>


                <div className="opp-summary-grid">

                    <div className="opp-summary-card">

                        <div>
                            <span className="badge-status bg-success-light text-success">
                                Internship
                            </span>

                            <h4>Machine Learning Intern</h4>

                            <p>
                                ABC Technologies
                            </p>
                        </div>

                        <span className="match-text">
                            18 eligible students
                        </span>

                    </div>


                    <div className="opp-summary-card">

                        <div>
                            <span className="badge-status bg-blue-light text-blue">
                                Live Project
                            </span>

                            <h4>AI Research Collaboration</h4>

                            <p>
                                Industry Research Lab
                            </p>
                        </div>

                        <span className="match-text">
                            11 eligible students
                        </span>

                    </div>


                    <div className="opp-summary-card">

                        <div>
                            <span className="badge-status bg-purple-light text-purple">
                                Workshop
                            </span>

                            <h4>Cloud Engineering Bootcamp</h4>

                            <p>
                                TechNova Solutions
                            </p>
                        </div>

                        <span className="match-text">
                            32 students matched
                        </span>

                    </div>

                </div>

            </section>


            {/* =====================================================
                PLACEMENT / INTERNSHIP OVERVIEW
            ===================================================== */}

            <section className="card mt-24">

                <div className="card-header">

                    <div>
                        <h3>Student Progress</h3>

                        <p className="subtitle">
                            Track internship and placement activity.
                        </p>
                    </div>

                    <button className="btn btn-outline">
                        Detailed Analytics
                    </button>

                </div>


                <div className="timeline-horizontal-grid">

                    <div className="timeline-card-item">

                        <div className="timeline-icon">
                            <i className="ph ph-user-list"></i>
                        </div>

                        <div>
                            <strong>126</strong>
                            <span className="time">
                                Students placement-ready
                            </span>
                        </div>

                    </div>


                    <div className="timeline-card-item">

                        <div className="timeline-icon">
                            <i className="ph ph-briefcase"></i>
                        </div>

                        <div>
                            <strong>74</strong>
                            <span className="time">
                                Internship applications
                            </span>
                        </div>

                    </div>


                    <div className="timeline-card-item">

                        <div className="timeline-icon">
                            <i className="ph ph-check-circle"></i>
                        </div>

                        <div>
                            <strong>38</strong>
                            <span className="time">
                                Students selected
                            </span>
                        </div>

                    </div>

                </div>

            </section>

        </main>
    );
}