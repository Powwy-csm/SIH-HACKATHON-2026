import React, { useState } from 'react';
import { mockData } from '../../data/mockData';

export default function PortfolioModal({ studentId, onClose }) {

    const [endorsed, setEndorsed] = useState(false);

    const student = mockData.students.find(s => s.id === studentId);
    const portfolio = mockData.portfolios[studentId];

    if (!student || !portfolio) {
        // Guards missing data instead of showing stale/masked fallback text.
        return (
            <div className="modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
                <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>Portfolio Not Available</h3>
                        <button className="icon-btn" onClick={onClose}><i className="ph ph-x"></i></button>
                    </div>
                    <div className="modal-body">
                        <p className="text-muted">No detailed portfolio has been recorded for this student yet.</p>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-outline" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>

                <div className="modal-header">
                    <h3>Verified Digital Student Portfolio</h3>
                    <button className="icon-btn" onClick={onClose}><i className="ph ph-x"></i></button>
                </div>

                <div className="modal-body">
                    <div className="academician-lead-card mb-24">
                        <div
                            className="avatar-2xl bg-blue-light text-blue font-bold"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}
                        >
                            {portfolio.initials}
                        </div>
                        <div>
                            <h4>{student.full_name}</h4>
                            <p className="designation">{portfolio.dept}</p>
                            <p className="affiliation">
                                <i className="ph-fill ph-seal-check text-blue"></i> Identity &amp; Academic Record Verified by SSN CE
                            </p>
                        </div>
                    </div>

                    <h4 className="font-bold mb-8" style={{ fontSize: '14px' }}>1. Verified Technical Skills &amp; Badges</h4>
                    <div className="tags mb-16">
                        {portfolio.verifiedSkills.map(skill => (
                            <span className="tag" key={skill}>
                                <i className="ph-fill ph-check-circle text-success"></i> {skill}
                            </span>
                        ))}
                    </div>

                    <h4 className="font-bold mb-8" style={{ fontSize: '14px' }}>2. Verified Industry Certifications</h4>
                    <div className="publication-badge-list mb-16">
                        {portfolio.certifications.map(cert => (
                            <div className="pub-item" key={cert.title}>
                                <div className="pub-title">{cert.title}</div>
                                <div className="pub-meta">{cert.meta}</div>
                            </div>
                        ))}
                    </div>

                    <h4 className="font-bold mb-8" style={{ fontSize: '14px' }}>3. Capstone Projects &amp; Internship Experience</h4>
                    <div className="experience-timeline">
                        {portfolio.experience.map(exp => (
                            <div className="exp-item" key={exp.title}>
                                <h5>{exp.title}</h5>
                                <p>{exp.detail}</p>
                                <span className="exp-duration">{exp.tag}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>Close</button>
                    <button
                        className={endorsed ? 'btn bg-success' : 'btn btn-primary'}
                        style={endorsed ? { color: 'white', border: 'none' } : undefined}
                        onClick={() => setEndorsed(e => !e)}
                    >
                        {endorsed ? (
                            <><i className="ph-fill ph-check-circle"></i> Endorsed</>
                        ) : (
                            <><i className="ph ph-thumbs-up"></i> Endorse for Placement</>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
