import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function InstitutionProfile() {
    const { user } = useAuth();
    const instName = user?.institution_name || user?.full_name || 'Academic Institution';
    const logoInitials = instName.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase() || 'INS';

    return (
        <main className="view-section active">

            {/* Profile Hero Card */}
            <div className="profile-hero card">
                <div className="hero-bg"></div>
                <div className="hero-content">
                    <div className="inst-avatar">{logoInitials}</div>
                    <div className="inst-details">
                        <div className="inst-title">
                            <h2>{instName}</h2>
                            <span className="verified-badge"><i className="ph-fill ph-seal-check"></i> Verified Partner Institution</span>
                            <span className="accreditation-pill">NAAC Accredited</span>
                            <span className="accreditation-pill">Tier-1 Academic Partner</span>
                        </div>
                        <p className="inst-meta">
                            Higher Education Institution • BridgeX Engineering &amp; Technology Linkage Network
                        </p>
                        <span className="inst-link">
                            <i className="ph ph-envelope"></i> {user?.email || 'contact@campus.edu'}
                        </span>
                    </div>
                    <div className="hero-actions">
                        <button className="btn btn-primary" onClick={() => alert('Profile verified and linked to BridgeX.')}>
                            <i className="ph ph-check-circle"></i> Verified
                        </button>
                        <button className="btn btn-outline" onClick={() => alert('Public Profile URL copied to clipboard!')}>
                            <i className="ph ph-share-network"></i> Share
                        </button>
                    </div>
                </div>

                <div className="inst-stats-bar">
                    <div className="i-stat">
                        <span className="val">4,800+</span>
                        <span className="lbl">Enrolled Students</span>
                    </div>
                    <div className="i-stat">
                        <span className="val">32</span>
                        <span className="lbl">Industry MoUs</span>
                    </div>
                    <div className="i-stat">
                        <span className="val">14</span>
                        <span className="lbl">Centers of Excellence</span>
                    </div>
                    <div className="i-stat">
                        <span className="val text-success">91%</span>
                        <span className="lbl">Placement Rate</span>
                    </div>
                    <div className="i-stat">
                        <span className="val text-blue">₹14.2 LPA</span>
                        <span className="lbl">Avg CSE Package</span>
                    </div>
                </div>
            </div>

            <div className="profile-layout-grid">

                {/* Left Column */}
                <div className="profile-col-main">

                    <section className="card p-24">
                        <h3 className="section-title"><i className="ph ph-info text-blue"></i> About the Institution</h3>
                        <p className="text-content">
                            SSN College of Engineering, founded by Dr. Shiv Nadar, is a top-ranked research institution
                            dedicated to fostering visionary engineers and researchers. With state-of-the-art research
                            parks, dedicated industry Centers of Excellence, and an outcome-based curriculum, SSN
                            bridges academia with cutting-edge industry demands.
                        </p>

                        <h4 className="font-bold mt-20 mb-8" style={{ fontSize: '14px' }}>
                            Key Academic Departments &amp; Programs
                        </h4>
                        <div className="tags">
                            <span className="tag">B.E. Computer Science &amp; Engineering</span>
                            <span className="tag">B.Tech Information Technology</span>
                            <span className="tag">B.E. Electronics &amp; Communication</span>
                            <span className="tag">B.Tech Artificial Intelligence &amp; Data Science</span>
                            <span className="tag">M.E. Cloud Computing &amp; Big Data</span>
                        </div>
                    </section>

                    <section className="card p-24">
                        <h3 className="section-title"><i className="ph ph-user-circle text-blue"></i> Academician Lead Dossier</h3>
                        <div className="academician-lead-card">
                            <img
                                src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'Academic Lead')}&background=EFF6FF&color=1D4ED8&bold=true`}
                                alt={user?.full_name || 'Academic Lead'}
                                className="avatar-2xl"
                            />
                            <div className="acad-info">
                                <h4>{user?.full_name || 'Academic & Placement Lead'}</h4>
                                <p className="designation">Dean • Corporate Relations &amp; Industry Linkage</p>
                                <p className="affiliation">Department of Computer Science &amp; Engineering • {instName}</p>

                                <div className="experience-timeline">
                                    <div className="exp-item">
                                        <h5>Dean of Corporate Relations &amp; Industry Partnerships</h5>
                                        <p>{instName} • Active Linkage</p>
                                        <span className="exp-duration">2022 – Present</span>
                                    </div>
                                    <div className="exp-item">
                                        <h5>Principal Academic Lead</h5>
                                        <p>Engineering &amp; Technology Faculty</p>
                                        <span className="exp-duration">2016 – 2022</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="card p-24">
                        <h3 className="section-title"><i className="ph ph-buildings text-blue"></i> Centers of Excellence (CoE) &amp; Industry Labs</h3>
                        <div className="coe-grid">
                            <div className="coe-card">
                                <h4>Cloud &amp; Distributed Systems Lab</h4>
                                <p className="coe-sponsor"><i className="ph-fill ph-seal-check"></i> Industry Partner Center</p>
                                <p className="coe-desc">High-performance cloud compute facility providing hands-on cloud architecture and DevOps training.</p>
                            </div>
                            <div className="coe-card">
                                <h4>Applied AI &amp; Data Intelligence Center</h4>
                                <p className="coe-sponsor"><i className="ph-fill ph-seal-check"></i> BridgeX Partner Network</p>
                                <p className="coe-desc">Co-sponsored R&amp;D facility developing real-world AI, machine learning, and data analytics competencies.</p>
                            </div>
                        </div>
                    </section>

                </div>

                {/* Right Column */}
                <div className="profile-col-side">

                    <section className="card p-24">
                        <h3 className="section-title"><i className="ph ph-medal text-blue"></i> Institutional Accreditations</h3>
                        <div className="accred-list">
                            <div className="accred-item">
                                <span className="accred-name">NAAC Accreditation</span>
                                <span className="accred-grade">Grade A++</span>
                            </div>
                            <div className="accred-item">
                                <span className="accred-name">NBA Tier-1 Accredited</span>
                                <span className="accred-grade">CSE / IT</span>
                            </div>
                        </div>
                    </section>

                    <section className="card p-24">
                        <h3 className="section-title"><i className="ph ph-phone-call text-blue"></i> Placement &amp; Linkage Office</h3>
                        <ul className="contact-list">
                            <li><i className="ph ph-user"></i><span>{user?.full_name || 'Dean, Corporate Relations'}</span></li>
                            <li><i className="ph ph-envelope-simple"></i><span>{user?.email || 'placement@campus.edu'}</span></li>
                            <li><i className="ph ph-map-pin"></i><span>{instName} Campus</span></li>
                        </ul>
                        <button
                            className="btn btn-outline w-100 mt-16"
                            onClick={() => alert('Downloading Campus Placement Dossier...')}
                        >
                            <i className="ph ph-download"></i> Campus Placement Dossier
                        </button>
                    </section>

                </div>
            </div>

        </main>
    );
}

function colorStyle(color) {
    const map = {
        cyan: { background: '#E0F2FE', color: '#0284C7' },
        purple: { background: '#F3E8FF', color: '#7C3AED' },
    };
    return map[color] || {};
}
