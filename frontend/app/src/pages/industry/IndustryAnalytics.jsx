import React from 'react';

export default function IndustryAnalytics() {
    return (
        <main className="dashboard-area">
            <div className="dashboard-header">
                <div>
                    <h2>Hiring Analytics &amp; Campus ROI</h2>
                    <p className="subtitle">Measure candidate conversion funnels, interview velocity, and institutional yield rates.</p>
                </div>
                <button className="btn btn-outline" type="button" onClick={() => alert('Exporting full analytics summary...')}>
                    <i className="ph ph-download-simple"></i> Export Analytics PDF
                </button>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-chart-line-up"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">68.4%</span>
                        <span className="stat-label">Interview Pass Rate</span>
                        <span className="stat-trend success"><i className="ph ph-arrow-up-right"></i> +6% vs last year</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-clock"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">12.5 Days</span>
                        <span className="stat-label">Avg Time-to-Offer</span>
                        <span className="stat-trend success"><i className="ph ph-arrow-up-right"></i> 4 days faster</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-hand-heart"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">88.5%</span>
                        <span className="stat-label">Offer Acceptance</span>
                        <span className="stat-trend success"><i className="ph ph-arrow-up-right"></i> High campus pull</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="ph ph-star"></i></div>
                    <div className="stat-info">
                        <span className="stat-value">4.8 / 5.0</span>
                        <span className="stat-label">Student Feedback Rating</span>
                        <span className="stat-trend success"><i className="ph ph-arrow-up-right"></i> Top 5% Industry</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-layout">
                <div className="col-main">
                    <section className="card p-24">
                        <h3 className="section-title">Campus Conversion Funnel (Past 6 Months)</h3>
                        <p className="subtitle mt-8">Tracking progression from initial job impressions to signed offers.</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                    <span><strong>1. Campus Views &amp; Clicks</strong></span>
                                    <span><strong>3,420 students</strong> (100%)</span>
                                </div>
                                <div className="progress-bar"><div className="progress-fill" style={{ width: '100%' }}></div></div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                    <span><strong>2. Completed Applications</strong></span>
                                    <span><strong>248 candidates</strong> (7.2%)</span>
                                </div>
                                <div className="progress-bar"><div className="progress-fill" style={{ width: '72%' }}></div></div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                    <span><strong>3. Verified Skill Shortlist</strong></span>
                                    <span><strong>80 candidates</strong> (32.2%)</span>
                                </div>
                                <div className="progress-bar"><div className="progress-fill good" style={{ width: '48%' }}></div></div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                    <span><strong>4. Technical &amp; Fit Interviews</strong></span>
                                    <span><strong>50 interviewed</strong> (62.5%)</span>
                                </div>
                                <div className="progress-bar"><div className="progress-fill good" style={{ width: '30%' }}></div></div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                    <span><strong>5. Final Offers Accepted</strong></span>
                                    <span><strong>31 hires</strong> (62.0%)</span>
                                </div>
                                <div className="progress-bar"><div className="progress-fill excellent" style={{ width: '18%' }}></div></div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="col-side">
                    <section className="card p-24">
                        <h3 className="section-title">Top Performing Campuses</h3>
                        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong style={{ fontSize: '13.5px' }}>SSN College of Engineering</strong>
                                    <p className="text-muted" style={{ fontSize: '12px' }}>14 offers accepted • 94% retention</p>
                                </div>
                                <span className="badge badge-success">Top Partner</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong style={{ fontSize: '13.5px' }}>Madras Institute of Tech</strong>
                                    <p className="text-muted" style={{ fontSize: '12px' }}>12 offers accepted • 91% retention</p>
                                </div>
                                <span className="badge badge-blue">CoE Partner</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong style={{ fontSize: '13.5px' }}>PSG College of Technology</strong>
                                    <p className="text-muted" style={{ fontSize: '12px' }}>5 offers accepted • 89% retention</p>
                                </div>
                                <span className="badge badge-gray">Active MoU</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
