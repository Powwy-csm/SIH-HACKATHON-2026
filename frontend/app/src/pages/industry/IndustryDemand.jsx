import React from 'react';

export default function IndustryDemand() {
    const marketDemands = [
        { skill: 'Python', demand: 86, growth: '+14% YoY', category: 'Programming & AI' },
        { skill: 'SQL & Database Design', demand: 78, growth: '+9% YoY', category: 'Data & Backend' },
        { skill: 'Cloud / AWS / Azure', demand: 71, growth: '+24% YoY', category: 'DevOps & Infra' },
        { skill: 'React & TypeScript', demand: 64, growth: '+11% YoY', category: 'Frontend' },
        { skill: 'Machine Learning & PyTorch', demand: 61, growth: '+32% YoY', category: 'AI & Data Science' },
        { skill: 'Docker & Containerization', demand: 48, growth: '+18% YoY', category: 'DevOps' },
        { skill: 'Kubernetes & CI/CD', demand: 42, growth: '+28% YoY', category: 'DevOps & Cloud' },
        { skill: 'Cyber Security & Zero Trust', demand: 39, growth: '+15% YoY', category: 'Security' },
    ];

    return (
        <main className="dashboard-area">
            <div className="dashboard-header">
                <div>
                    <h2>Industry Skill Demand &amp; Market Insights</h2>
                    <p className="subtitle">Real-time skill requirements benchmarked against campus curriculum offerings.</p>
                </div>
                <button className="btn btn-primary" type="button" onClick={() => alert('Publishing targeted skill requirement to partner colleges...')}>
                    <i className="ph ph-plus"></i> Request Skill Focus to Colleges
                </button>
            </div>

            <div className="dashboard-layout">
                <div className="col-main">
                    <section className="card">
                        <div className="card-header">
                            <div>
                                <h3>High Demand Technical Capabilities</h3>
                                <p className="subtitle">Identified across active software, cloud, and AI job descriptions.</p>
                            </div>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <div className="skill-demand-list" style={{ padding: 0 }}>
                                {marketDemands.map(item => (
                                    <div className="demand-item" key={item.skill}>
                                        <div className="demand-label">
                                            <span>
                                                <strong>{item.skill}</strong>{' '}
                                                <span className="badge badge-gray" style={{ marginLeft: '8px', fontSize: '11px' }}>
                                                    {item.category}
                                                </span>
                                            </span>
                                            <span style={{ fontWeight: 600 }}>
                                                {item.demand}% <span className="stat-trend success" style={{ display: 'inline-flex', marginLeft: '6px' }}>{item.growth}</span>
                                            </span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${item.demand}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                <div className="col-side">
                    <section className="card p-24">
                        <h3 className="section-title">Campus Readiness Gap</h3>
                        <p className="subtitle mt-8">
                            Most common skills students lack when applying for tech internships:
                        </p>
                        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ padding: '12px', background: 'var(--bg-light)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--danger)' }}>
                                <strong style={{ fontSize: '13px' }}>Docker &amp; Containerization</strong>
                                <p className="text-muted mt-4" style={{ fontSize: '12px' }}>54% deficit across 3rd-year engineering applicants.</p>
                            </div>
                            <div style={{ padding: '12px', background: 'var(--bg-light)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--danger)' }}>
                                <strong style={{ fontSize: '13px' }}>Kubernetes &amp; Cloud CI/CD</strong>
                                <p className="text-muted mt-4" style={{ fontSize: '12px' }}>62% deficit across campus placements.</p>
                            </div>
                            <div style={{ padding: '12px', background: 'var(--bg-light)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--warning)' }}>
                                <strong style={{ fontSize: '13px' }}>Production LLM Fine-Tuning</strong>
                                <p className="text-muted mt-4" style={{ fontSize: '12px' }}>High student interest, limited real-world deployment experience.</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
