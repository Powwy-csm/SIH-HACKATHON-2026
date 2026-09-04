import React from 'react';
import { mockData } from '../../data/mockData';

export default function InstitutionProfile() {
    return (
        <main className="view-section active">

            {/* Profile Hero Card */}
            <div className="profile-hero card">
                <div className="hero-bg"></div>
                <div className="hero-content">
                    <div className="inst-avatar">{mockData.institution.logo_url}</div>
                    <div className="inst-details">
                        <div className="inst-title">
                            <h2>{mockData.institution.name}</h2>
                            <span className="verified-badge"><i className="ph-fill ph-seal-check"></i> Verified Institution</span>
                            <span className="accreditation-pill">NAAC A++ Grade</span>
                            <span className="accreditation-pill">NIRF Rank #45</span>
                        </div>
                        <p className="inst-meta">
                            Autonomous Engineering Institution • Affiliated to Anna University • Established 1996 • Chennai, Tamil Nadu
                        </p>
                        <a href="https://www.ssn.edu.in" target="_blank" rel="noreferrer" className="inst-link">
                            <i className="ph ph-globe"></i> https://www.ssn.edu.in
                        </a>
                    </div>
                    <div className="hero-actions">
                        <button className="btn btn-primary" onClick={() => alert('Editing Institution Profile...')}>
                            <i className="ph ph-pencil-simple"></i> Edit Profile
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
                                src={mockData.currentUser.avatar_url}
                                alt={mockData.currentUser.full_name}
                                className="avatar-2xl"
                            />
                            <div className="acad-info">
                                <h4>{mockData.currentUser.full_name}</h4>
                                <p className="designation">Dean • Corporate Relations &amp; Industry Linkage</p>
                                <p className="affiliation">Professor, Department of Computer Science &amp; Engineering • SSN CE</p>

                                <div className="experience-timeline">
                                    <div className="exp-item">
                                        <h5>Dean of Corporate Relations &amp; Industry Partnerships</h5>
                                        <p>SSN College of Engineering • Full-time</p>
                                        <span className="exp-duration">2020 – Present • 6 yrs</span>
                                    </div>
                                    <div className="exp-item">
                                        <h5>Principal Research Scientist</h5>
                                        <p>TechCorp R&amp;D Labs, Bengaluru</p>
                                        <span className="exp-duration">2015 – 2020 • 5 yrs</span>
                                    </div>
                                    <div className="exp-item">
                                        <h5>Ph.D. in Computer Science (Distributed Systems &amp; ML)</h5>
                                        <p>Indian Institute of Science (IISc), Bangalore</p>
                                        <span className="exp-duration">2010 – 2015</span>
                                    </div>
                                </div>

                                <h5 className="font-bold mt-24" style={{ fontSize: '14px' }}>
                                    Notable Research Publications &amp; Patents
                                </h5>
                                <div className="publication-badge-list">
                                    <div className="pub-item">
                                        <div className="pub-title">
                                            "Optimized Edge AI Inference Scheduling in Heterogeneous Cloud Environments"
                                        </div>
                                        <div className="pub-meta">
                                            <span>IEEE Transactions on Cloud Computing (2025)</span> • <span>Citations: 42</span>
                                        </div>
                                    </div>
                                    <div className="pub-item">
                                        <div className="pub-title">
                                            Patent: "Automated Competency Mapping for Engineering Skill Development via Graph Networks"
                                        </div>
                                        <div className="pub-meta">
                                            <span>Indian Patent Office • Granted (2024)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="card p-24">
                        <h3 className="section-title"><i className="ph ph-buildings text-blue"></i> Centers of Excellence (CoE) &amp; Co-Sponsored Labs</h3>
                        <div className="coe-grid">
                            <div className="coe-card">
                                <h4>AWS Cloud Innovation Center</h4>
                                <p className="coe-sponsor"><i className="ph-fill ph-seal-check"></i> Amazon Web Services Partnership</p>
                                <p className="coe-desc">Dedicated 120-seat high-performance cloud compute facility providing hands-on AWS certification training.</p>
                            </div>
                            <div className="coe-card">
                                <h4>GenAI &amp; Data Intelligence Lab</h4>
                                <p className="coe-sponsor"><i className="ph-fill ph-seal-check"></i> ABC Technologies Co-Sponsored</p>
                                <p className="coe-desc">Corporate-sponsored R&amp;D hub developing enterprise LLM fine-tuning pipelines and NLP models.</p>
                            </div>
                            <div className="coe-card">
                                <h4>Autonomous Robotics Research Hub</h4>
                                <p className="coe-sponsor"><i className="ph-fill ph-seal-check"></i> XYZ Research Labs Partnership</p>
                                <p className="coe-desc">Robotics and embedded systems testbed for drone navigation and industrial automation projects.</p>
                            </div>
                            <div className="coe-card">
                                <h4>Cybersecurity &amp; Threat Defense CoE</h4>
                                <p className="coe-sponsor"><i className="ph-fill ph-seal-check"></i> National Cyber Safety Net</p>
                                <p className="coe-desc">SOC simulator and ethical hacking training lab for advanced security auditing.</p>
                            </div>
                        </div>
                    </section>

                </div>

                {/* Right Column */}
                <div className="profile-col-side">

                    <section className="card p-24">
                        <h3 className="section-title"><i className="ph ph-medal text-blue"></i> Accreditations</h3>
                        <div className="accred-list">
                            {mockData.accreditations.map(a => (
                                <div className="accred-item" key={a.name}>
                                    <span className="accred-name">{a.name}</span>
                                    <span className="accred-grade">{a.grade}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="card p-24">
                        <h3 className="section-title"><i className="ph ph-handshake text-blue"></i> Key MoU Partners</h3>
                        <div className="mou-list">
                            {mockData.mouPartners.map(partner => (
                                <div className="mou-item" key={partner.name}>
                                    <div
                                        className="logo-box"
                                        style={partner.color !== 'blue' ? colorStyle(partner.color) : undefined}
                                    >
                                        {partner.initials}
                                    </div>
                                    <div className="mou-info">
                                        <h5>{partner.name}</h5>
                                        <p>{partner.period}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="card p-24">
                        <h3 className="section-title"><i className="ph ph-phone-call text-blue"></i> Corporate Relations Contact</h3>
                        <ul className="contact-list">
                            <li><i className="ph ph-user"></i><span>{mockData.placementContact.officer}</span></li>
                            <li><i className="ph ph-envelope-simple"></i><span>{mockData.placementContact.email}</span></li>
                            <li><i className="ph ph-phone"></i><span>{mockData.placementContact.phone}</span></li>
                            <li><i className="ph ph-map-pin"></i><span>{mockData.placementContact.address}</span></li>
                        </ul>
                        <button
                            className="btn btn-outline w-100 mt-16"
                            onClick={() => alert('Downloading Placement Brochure 2026-27...')}
                        >
                            <i className="ph ph-download"></i> Placement Brochure
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
