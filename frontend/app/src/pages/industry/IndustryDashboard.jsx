import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import PostOpportunityModal from '../../components/modals/PostOpportunityModal';

const INITIAL_CANDIDATES = [
    {
        id: 1,
        name: 'Aarav Sharma',
        college: 'SSN College of Engineering • B.E. Computer Science',
        avatar: 'https://ui-avatars.com/api/?name=Aarav+Sharma&background=E2E8F0&color=172033',
        skills: ['Python', 'Machine Learning', 'SQL', 'React'],
        gap: 'Docker, Kubernetes',
        match: 92,
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
        stats: '6 Projects • 1 Certification',
    },
    {
        id: 3,
        name: 'Rahul Verma',
        college: 'PSG College of Technology • Data Science',
        avatar: 'https://ui-avatars.com/api/?name=Rahul+Verma&background=E2E8F0&color=172033',
        skills: ['Python', 'SQL', 'PowerBI'],
        match: 84,
        stats: '3 Projects • 3 Certifications',
    },
];

export default function IndustryDashboard() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [shortlisted, setShortlisted] = useState(new Set());
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    // Initialize Chart.js
    useEffect(() => {
        if (!chartRef.current) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                datasets: [
                    {
                        label: 'Applied',
                        data: [65, 78, 90, 115, 140, 248],
                        borderColor: '#94A3B8',
                        backgroundColor: 'rgba(148, 163, 184, 0.08)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBorderWidth: 3,
                        pointHoverBackgroundColor: '#FFFFFF',
                    },
                    {
                        label: 'Shortlisted',
                        data: [20, 25, 30, 45, 55, 80],
                        borderColor: '#2563EB',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBorderWidth: 3,
                        pointHoverBackgroundColor: '#FFFFFF',
                    },
                    {
                        label: 'Interviewed',
                        data: [15, 18, 22, 35, 40, 50],
                        borderColor: '#F59E0B',
                        backgroundColor: 'rgba(245, 158, 11, 0.06)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBorderWidth: 3,
                        pointHoverBackgroundColor: '#FFFFFF',
                    },
                    {
                        label: 'Selected',
                        data: [5, 8, 12, 18, 24, 31],
                        borderColor: '#16A34A',
                        backgroundColor: 'rgba(22, 163, 74, 0.08)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBorderWidth: 3,
                        pointHoverBackgroundColor: '#FFFFFF',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 8,
                            padding: 20,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12,
                                weight: '500',
                            },
                        },
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#091527',
                        titleFont: { family: "'Inter', sans-serif", size: 13, weight: '700' },
                        bodyFont: { family: "'Inter', sans-serif", size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        boxPadding: 4,
                    },
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false,
                        },
                        ticks: {
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12,
                            },
                            color: '#64748B',
                        },
                    },
                    y: {
                        grid: {
                            color: '#F1F5F9',
                            drawBorder: false,
                        },
                        ticks: {
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12,
                            },
                            color: '#64748B',
                            stepSize: 50,
                        },
                    },
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false,
                },
            },
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, []);

    const toggleShortlist = (id) => {
        setShortlisted(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <main className="dashboard-area">
            {/* Dashboard Header */}
            <div className="dashboard-header">
                <div>
                    <h2>Good morning, ABC Technologies</h2>
                    <p className="subtitle">Discover talent, build partnerships, and connect with academia.</p>
                </div>
                <button className="btn btn-primary" type="button" onClick={() => setIsModalOpen(true)}>
                    <i className="ph ph-plus"></i> Post Opportunity
                </button>
            </div>

            {/* Dashboard Overview */}
            <section className="tab-panel active" id="overviewPanel" role="tabpanel">
                    {/* Stats Grid */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon"><i className="ph ph-briefcase"></i></div>
                            <div className="stat-info">
                                <span className="stat-value">12</span>
                                <span className="stat-label">Open Opportunities</span>
                                <span className="stat-trend success"><i className="ph ph-arrow-up-right"></i> +3 this month</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><i className="ph ph-files"></i></div>
                            <div className="stat-info">
                                <span className="stat-value">248</span>
                                <span className="stat-label">Total Applications</span>
                                <span className="stat-trend success"><i className="ph ph-arrow-up-right"></i> +18% this month</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><i className="ph ph-user-check"></i></div>
                            <div className="stat-info">
                                <span className="stat-value">31</span>
                                <span className="stat-label">Shortlisted Candidates</span>
                                <span className="stat-trend success"><i className="ph ph-arrow-up-right"></i> +7 this week</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><i className="ph ph-handshake"></i></div>
                            <div className="stat-info">
                                <span className="stat-value">8</span>
                                <span className="stat-label">Active Collaborations</span>
                                <span className="stat-trend neutral"><i className="ph ph-minus"></i> 3 new this month</span>
                            </div>
                        </div>
                    </div>

                    {/* Complex Layout Grid */}
                    <div className="dashboard-layout">
                        {/* Left Column (Wider) */}
                        <div className="col-main">
                            {/* Top Talent Matches */}
                            <section className="card">
                                <div className="card-header">
                                    <div>
                                        <h3>Top Talent Matches</h3>
                                        <p className="subtitle">Students whose skills closely match your current requirements.</p>
                                    </div>
                                    <button className="btn-text" type="button" onClick={() => alert('Viewing all matched students...')}>
                                        View All
                                    </button>
                                </div>
                                <div className="talent-list">
                                    {INITIAL_CANDIDATES.map(cand => {
                                        const isCandidateShortlisted = shortlisted.has(cand.id);
                                        return (
                                            <div className="talent-card" key={cand.id}>
                                                <div className="talent-basic">
                                                    <img src={cand.avatar} alt={cand.name} className="avatar-lg" />
                                                    <div className="talent-info">
                                                        <h4>{cand.name}</h4>
                                                        <p className="college">{cand.college}</p>
                                                        <div className="skills-wrap">
                                                            {cand.skills.map(skill => (
                                                                <span className="skill-pill" key={skill}>{skill}</span>
                                                            ))}
                                                        </div>
                                                        {cand.gap && (
                                                            <div className="skill-gap text-danger mt-8" style={{ fontSize: '12.5px', fontWeight: 600 }}>
                                                                <i className="ph-fill ph-warning-circle"></i> Gap: {cand.gap}
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
                                                            onClick={() => alert(`Previewing digital portfolio for ${cand.name}...`)}
                                                        >
                                                            View Profile
                                                        </button>
                                                        <button
                                                            className={`btn btn-primary btn-shortlist ${isCandidateShortlisted ? 'shortlisted' : ''}`}
                                                            type="button"
                                                            onClick={() => toggleShortlist(cand.id)}
                                                        >
                                                            {isCandidateShortlisted ? (
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
                                </div>
                            </section>

                            {/* Active Opportunities */}
                            <section className="card">
                                <div className="card-header">
                                    <h3>Active Opportunities</h3>
                                    <button className="btn-text" type="button" onClick={() => setIsModalOpen(true)}>
                                        + Post New
                                    </button>
                                </div>
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Opportunity</th>
                                                <th>Type</th>
                                                <th>Applications</th>
                                                <th>Deadline</th>
                                                <th>Status</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="font-medium">AI Engineer Intern</td>
                                                <td><span className="badge badge-gray">Internship</span></td>
                                                <td>48</td>
                                                <td>Sep 15, 2026</td>
                                                <td><span className="badge badge-success">Active</span></td>
                                                <td><button className="btn-link" type="button" onClick={() => alert('Managing AI Engineer Intern applicants...')}>Manage</button></td>
                                            </tr>
                                            <tr>
                                                <td className="font-medium">Data Analyst</td>
                                                <td><span className="badge badge-gray">Internship</span></td>
                                                <td>32</td>
                                                <td>Sep 20, 2026</td>
                                                <td><span className="badge badge-success">Active</span></td>
                                                <td><button className="btn-link" type="button" onClick={() => alert('Managing Data Analyst applicants...')}>Manage</button></td>
                                            </tr>
                                            <tr>
                                                <td className="font-medium">Frontend Developer</td>
                                                <td><span className="badge badge-blue">Entry-level</span></td>
                                                <td>61</td>
                                                <td>Sep 25, 2026</td>
                                                <td><span className="badge badge-success">Active</span></td>
                                                <td><button className="btn-link" type="button" onClick={() => alert('Managing Frontend Developer applicants...')}>Manage</button></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* Application Overview Chart */}
                            
                        </div>

                        {/* Right Column (Narrower) */}
                        <div className="col-side">
                            {/* Industry Skill Demand */}
                            <section className="card">
                                <div className="card-header border-none">
                                    <div>
                                        <h3>Industry Skill Demand</h3>
                                        <p className="subtitle">Skills most frequently requested in your sector.</p>
                                    </div>
                                </div>
                                <div className="skill-demand-list">
                                    <div className="demand-item">
                                        <div className="demand-label"><span>Python</span> <span>86%</span></div>
                                        <div className="progress-bar"><div className="progress-fill" style={{ width: '86%' }}></div></div>
                                    </div>
                                    <div className="demand-item">
                                        <div className="demand-label"><span>SQL</span> <span>78%</span></div>
                                        <div className="progress-bar"><div className="progress-fill" style={{ width: '78%' }}></div></div>
                                    </div>
                                    <div className="demand-item">
                                        <div className="demand-label"><span>Cloud / AWS</span> <span>71%</span></div>
                                        <div className="progress-bar"><div className="progress-fill" style={{ width: '71%' }}></div></div>
                                    </div>
                                    <div className="demand-item">
                                        <div className="demand-label"><span>React</span> <span>64%</span></div>
                                        <div className="progress-bar"><div className="progress-fill" style={{ width: '64%' }}></div></div>
                                    </div>
                                    <div className="demand-item">
                                        <div className="demand-label"><span>Machine Learning</span> <span>61%</span></div>
                                        <div className="progress-bar"><div className="progress-fill" style={{ width: '61%' }}></div></div>
                                    </div>
                                    <div className="demand-item">
                                        <div className="demand-label"><span>Docker</span> <span>48%</span></div>
                                        <div className="progress-bar"><div className="progress-fill" style={{ width: '48%' }}></div></div>
                                    </div>
                                </div>
                            </section>

                            {/* Academia Collaboration */}
                            <section className="card collab-card">
                                <div className="card-header">
                                    <h3>Academia Collaboration</h3>
                                    <span className="badge badge-blue">8 Active</span>
                                </div>
                                <div className="collab-events">
                                    <h4 className="section-micro-title">Upcoming</h4>
                                    <div className="event-item">
                                        <div className="event-date">
                                            <span className="day">24</span>
                                            <span className="month">Aug</span>
                                        </div>
                                        <div className="event-details">
                                            <h5>AI &amp; Cloud Workshop</h5>
                                            <p>SSN College of Engineering</p>
                                        </div>
                                    </div>
                                    <div className="event-item">
                                        <div className="event-date">
                                            <span className="day">02</span>
                                            <span className="month">Sep</span>
                                        </div>
                                        <div className="event-details">
                                            <h5>Industry Project Challenge</h5>
                                            <p>ABC Tech × CSE Department</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="collab-actions">
                                    <button className="btn btn-outline" type="button" onClick={() => alert('Viewing all university collaborations...')}>View All</button>
                                    <button className="btn btn-primary" type="button" onClick={() => alert('Initiating new academia collaboration...')}>Create Collab</button>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Recent Activity: Full-Width Section (Brought Down) */}
                    <section className="card application-overview-section">
                                <div className="card-header">
                                    <div>
                                        <h3>Application Overview</h3>
                                        <p className="subtitle">Candidate progression over the last 6 months.</p>
                                    </div>
                                </div>
                                <div className="chart-container">
                                    <canvas id="applicationsChart" ref={chartRef}></canvas>
                                </div>
                            </section>

                    <section className="card recent-activity-section">
                        <div className="card-header border-none">
                            <div>
                                <h3>Recent Activity</h3>
                                <p className="subtitle">Live platform updates across applications, shortlists, and collaboration requests.</p>
                            </div>
                            <span className="badge badge-blue">Live Stream</span>
                        </div>
                        <div className="recent-activity-grid">
                            <div className="activity-card">
                                <div className="timeline-icon bg-light-blue text-accent"><i className="ph ph-files"></i></div>
                                <div className="timeline-content">
                                    <p><strong>5 new applications</strong> received for AI Engineer Intern.</p>
                                    <span className="time">2 hours ago</span>
                                </div>
                            </div>
                            <div className="activity-card">
                                <div className="timeline-icon bg-light-success text-success"><i className="ph ph-user-check"></i></div>
                                <div className="timeline-content">
                                    <p><strong>Aarav Sharma</strong> was shortlisted for the ML Internship role.</p>
                                    <span className="time">4 hours ago</span>
                                </div>
                            </div>
                            <div className="activity-card">
                                <div className="timeline-icon bg-light-blue text-accent"><i className="ph ph-users"></i></div>
                                <div className="timeline-content">
                                    <p><strong>3 students</strong> registered for your Python workshop.</p>
                                    <span className="time">Yesterday</span>
                                </div>
                            </div>
                            <div className="activity-card">
                                <div className="timeline-icon bg-light-warning text-warning"><i className="ph ph-handshake"></i></div>
                                <div className="timeline-content">
                                    <p>New collaboration request from <strong>SSN College</strong>.</p>
                                    <span className="time">Yesterday</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </section>

            {/* Post Opportunity Modal */}
            {isModalOpen && (
                <PostOpportunityModal
                    onClose={() => setIsModalOpen(false)}
                    onPublish={(data) => {
                        console.log('Published opportunity:', data);
                    }}
                />
            )}
        </main>
    );
}