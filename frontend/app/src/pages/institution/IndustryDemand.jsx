import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchInstitutionSkillGap } from '../../services/institutionService';

export default function IndustryDemand() {
    const { accessToken } = useAuth();
    const [demandData, setDemandData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            if (!accessToken) return;
            setLoading(true);
            setError(null);
            try {
                const data = await fetchInstitutionSkillGap(accessToken);
                if (mounted && data) {
                    setDemandData(data);
                }
            } catch (err) {
                console.error('Failed to load industry skill gaps:', err);
                if (mounted) setError(err.message || 'Unable to load real skill deficit analysis.');
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [accessToken]);

    const stats = demandData?.demandStats || [];
    const skillMapping = demandData?.skillMapping || [];

    return (
        <main className="view-section active">

            <div className="dashboard-header">
                <div>
                    <h2>Industry Demand vs Student Skill Proficiency</h2>
                    <p className="subtitle">
                        Analyze live market demand curves against institutional readiness to optimize curriculum alignment.
                    </p>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
                    <i className="ph ph-circle-notch" style={{ fontSize: 36, display: 'block', marginBottom: 12 }}></i>
                    Analyzing market demand &amp; student skill coverage from database…
                </div>
            ) : error ? (
                <div style={{ padding: '24px', color: 'var(--danger, #dc3545)', textAlign: 'center' }}>
                    <i className="ph ph-warning-circle" style={{ marginRight: 6 }} />
                    {error}
                </div>
            ) : (
                <>
                    <div className="stats-grid grid-3">
                        {stats.map(stat => (
                            <div className="stat-card" key={stat.label}>
                                <div className="stat-info">
                                    <span className="stat-label">{stat.label}</span>
                                    <span className="stat-value">{stat.value}</span>
                                    <span className="stat-trend success">
                                        <i className="ph ph-trend-up"></i> {stat.trend}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="card mt-24">
                        <div className="card-header">
                            <div>
                                <h3>Comprehensive Skill Mapping &amp; Deficit Analysis</h3>
                                <p className="subtitle" style={{ fontSize: '13px', marginTop: '2px' }}>
                                    Computed from {demandData?.total_postings || 0} active industry postings and {demandData?.total_students || 0} enrolled students.
                                </p>
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Skill Domain</th>
                                        <th>Industry Demand (%)</th>
                                        <th>Student Proficiency (%)</th>
                                        <th>Deficit Gap (%)</th>
                                        <th>Actionable Recommendation</th>
                                        <th>Intervention Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {skillMapping.map(row => (
                                        <tr key={row.domain}>
                                            <td className="font-semibold">{row.domain}</td>
                                            <td>{row.demand}%</td>
                                            <td>{row.proficiency}%</td>
                                            <td>
                                                {row.aligned ? (
                                                    <span className="badge-status bg-success-light text-success">
                                                        {row.gap}% Gap (Aligned)
                                                    </span>
                                                ) : (
                                                    <span className="gap-badge">{row.gap}% Gap</span>
                                                )}
                                            </td>
                                            <td>{row.recommendation}</td>
                                            <td>
                                                <span className={`badge-status bg-${row.statusColor}-light text-${row.statusColor}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {skillMapping.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                                No industry skill-demand data available yet. Post industry opportunities to view real skill gap metrics.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

        </main>
    );
}

