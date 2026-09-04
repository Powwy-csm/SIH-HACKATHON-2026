import React from 'react';
import { mockData } from '../../data/mockData';

export default function IndustryDemand() {
    return (
        <main className="view-section active">

            <div className="dashboard-header">
                <div>
                    <h2>Industry Demand vs Student Skill Proficiency</h2>
                    <p className="subtitle">
                        Analyze market demand curves against institutional readiness to optimize curriculum alignment.
                    </p>
                </div>
            </div>

            <div className="stats-grid grid-3">
                {mockData.demandStats.map(stat => (
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
                    <h3>Comprehensive Skill Mapping &amp; Deficit Analysis</h3>
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
                            {mockData.skillMapping.map(row => (
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
                        </tbody>
                    </table>
                </div>
            </div>

        </main>
    );
}
