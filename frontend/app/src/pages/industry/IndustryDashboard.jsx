import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import PostOpportunityModal from '../../components/modals/PostOpportunityModal';
import { apiFetch } from '../../services/apiClient';

export default function IndustryDashboard() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [shortlisted, setShortlisted] = useState(new Set());
    const [dashboardData, setDashboardData] = useState(null);
    const [loadingDashboard, setLoadingDashboard] = useState(true);
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const loadDashboard = React.useCallback(async () => {
        setLoadingDashboard(true);
        try {
            const data = await apiFetch('/api/industry/dashboard');
            if (data) {
                setDashboardData(data);
            }
        } catch (err) {
            console.error('Failed to load industry dashboard data:', err);
        } finally {
            setLoadingDashboard(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

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
                    <h2>Good morning, {dashboardData?.company_name || 'Industry Partner'}</h2>
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
                                <span className="stat-value">{dashboardData?.open_opportunities_count ?? 0}</span>
                                <span className="stat-label">Open Opportunities</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><i className="ph ph-files"></i></div>
                            <div className="stat-info">
                                <span className="stat-value">{dashboardData?.total_applications_count ?? 0}</span>
                                <span className="stat-label">Total Applications</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><i className="ph ph-user-check"></i></div>
                            <div className="stat-info">
                                <span className="stat-value">{dashboardData?.shortlisted_candidates_count ?? 0}</span>
                                <span className="stat-label">Shortlisted Candidates</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><i className="ph ph-handshake"></i></div>
                            <div className="stat-info">
                                <span className="stat-value">{dashboardData?.active_collaborations_count ?? 0}</span>
                                <span className="stat-label">Active Collaborations</span>
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
                                </div>
                                <div className="talent-list">
                                    {loadingDashboard ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>Loading student candidates…</div>
                                    ) : (dashboardData?.top_talent_matches || []).length > 0 ? (
                                        (dashboardData.top_talent_matches).map(cand => {
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
                                        })
                                    ) : (
                                        <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                                            No student candidates found in database.
                                        </div>
                                    )}
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
                                            {(dashboardData?.recent_postings || []).map(p => {
                                                const rawType = p.type || 'internship';
                                                const typeLabel = rawType.charAt(0).toUpperCase() + rawType.slice(1);
                                                const statusLabel = p.status === 'open' ? 'Active' : (p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : 'Active');
                                                return (
                                                    <tr key={p.id}>
                                                        <td className="font-medium">{p.title || 'Untitled Opportunity'}</td>
                                                        <td>
                                                            <span className={`badge ${rawType === 'internship' ? 'badge-gray' : 'badge-blue'}`}>
                                                                {typeLabel}
                                                            </span>
                                                        </td>
                                                        <td>{p.applicant_count || 0}</td>
                                                        <td>{p.deadline || '—'}</td>
                                                        <td>
                                                            <span className="badge badge-success">{statusLabel}</span>
                                                        </td>
                                                        <td>
                                                            <a className="btn-link" href="/industry/opportunities">Manage</a>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {(!dashboardData?.recent_postings || dashboardData.recent_postings.length === 0) && (
                                                <tr>
                                                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>
                                                        No active opportunities posted yet. Click "+ Post New" above to publish a role.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                            
                        </div>

                        {/* Right Column (Narrower) */}
                        <div className="col-side">
                            {/* Industry Skill Demand */}
                            <section className="card">
                                <div className="card-header border-none">
                                    <div>
                                        <h3>Industry Skill Demand</h3>
                                        <p className="subtitle">Skills most frequently requested in your published postings.</p>
                                    </div>
                                </div>
                                <div className="skill-demand-list">
                                    {(dashboardData?.skill_demand || []).map(sd => (
                                        <div className="demand-item" key={sd.skill}>
                                            <div className="demand-label">
                                                <span>{sd.skill}</span>
                                                <span>{sd.percentage}% ({sd.count} Postings)</span>
                                            </div>
                                            <div className="progress-bar">
                                                <div className="progress-fill" style={{ width: `${Math.min(sd.percentage, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!dashboardData?.skill_demand || dashboardData.skill_demand.length === 0) && (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                                            No industry skill-demand data available yet.
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Academia Collaboration */}
                            <section className="card collab-card">
                                <div className="card-header">
                                    <h3>Academia Collaboration</h3>
                                    <span className="badge badge-blue">Partner Hub</span>
                                </div>
                                <div className="collab-events">
                                    <h4 className="section-micro-title">Programs &amp; Linkages</h4>
                                    <div className="event-item">
                                        <div className="event-date">
                                            <span className="day"><i className="ph ph-handshake"></i></span>
                                            <span className="month">Active</span>
                                        </div>
                                        <div className="event-details">
                                            <h5>Campus Hiring &amp; Internship Network</h5>
                                            <p>BridgeX Verified University Network</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="collab-actions">
                                    <a className="btn btn-outline" href="/industry/talent">Explore Talent</a>
                                    <button className="btn btn-primary" type="button" onClick={() => setIsModalOpen(true)}>Create Program</button>
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
                                <p className="subtitle">Live platform updates across applications and candidate status updates.</p>
                            </div>
                            <span className="badge badge-blue">Live Stream</span>
                        </div>
                        <div className="recent-activity-grid">
                            {(dashboardData?.recent_activity || []).map(act => (
                                <div className="activity-card" key={act.id}>
                                    <div className="timeline-icon bg-light-blue text-accent"><i className="ph ph-user-check"></i></div>
                                    <div className="timeline-content">
                                        <p><strong>{act.text}</strong></p>
                                        <span className="time">{act.applied_at ? new Date(act.applied_at).toLocaleDateString() : 'Recent'}</span>
                                    </div>
                                </div>
                            ))}
                            {(!dashboardData?.recent_activity || dashboardData.recent_activity.length === 0) && (
                                <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', gridColumn: '1 / -1' }}>
                                    No application activity yet. Applications from students will stream here in real time.
                                </div>
                            )}
                        </div>
                    </section>
                </section>

            {/* Post Opportunity Modal */}
            {isModalOpen && (
                <PostOpportunityModal
                    onClose={() => setIsModalOpen(false)}
                    onPublish={(_data) => {
                        loadDashboard();
                    }}
                />
            )}
        </main>
    );
}