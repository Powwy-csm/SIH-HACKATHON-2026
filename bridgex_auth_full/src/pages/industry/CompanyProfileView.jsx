import React from 'react';

export default function CompanyProfileView({ onEditProfile }) {
    const handleShare = () => {
        navigator.clipboard?.writeText(window.location.href);
        alert('Public Profile URL copied to clipboard!');
    };

    return (
        <section className="tab-panel active" id="profilePanel" role="tabpanel" aria-labelledby="profileTab">
            {/* Profile Hero Card */}
            <section className="card profile-hero-card">
                <div className="profile-hero-banner"></div>
                <div className="profile-hero-content">
                    <div className="profile-hero-header">
                        <div className="profile-avatar">
                            ABC
                            <div className="verified-badge" title="Verified Industry Partner">
                                <i className="ph-fill ph-seal-check"></i>
                            </div>
                        </div>
                        <div className="profile-details">
                            <div className="profile-title">
                                <h2>ABC Technologies</h2>
                            </div>
                            <p className="profile-meta">
                                <span><i className="ph ph-buildings"></i> Enterprise Software &amp; Applied Cloud AI</span>
                                <span>•</span>
                                <span><i className="ph ph-map-pin"></i> Bengaluru, Karnataka, India</span>
                                <span>•</span>
                                <span>
                                    <i className="ph ph-globe"></i>{' '}
                                    <a href="https://abctechnologies.demo" target="_blank" rel="noreferrer">
                                        https://abctechnologies.demo
                                    </a>
                                </span>
                            </p>
                        </div>
                        <div className="profile-actions">
                            <button
                                className="btn btn-primary"
                                type="button"
                                onClick={onEditProfile || (() => alert('Opening Profile Editor...'))}
                            >
                                <i className="ph ph-pencil-simple"></i> Edit Profile
                            </button>
                            <button className="btn btn-outline" type="button" onClick={handleShare}>
                                <i className="ph ph-share-network"></i> Share
                            </button>
                        </div>
                    </div>

                    {/* Institutional / Company KPI Bar */}
                    <div className="profile-stats-bar">
                        <div className="p-stat">
                            <span className="val">12</span>
                            <span className="lbl">Open Opportunities</span>
                        </div>
                        <div className="p-stat">
                            <span className="val">8</span>
                            <span className="lbl">University MoUs</span>
                        </div>
                        <div className="p-stat">
                            <span className="val">46</span>
                            <span className="lbl">Students Hired</span>
                        </div>
                        <div className="p-stat">
                            <span className="val text-success">4.8★</span>
                            <span className="lbl">Campus Rating</span>
                        </div>
                        <div className="p-stat">
                            <span className="val text-blue">₹18.5 LPA</span>
                            <span className="lbl">Avg CTC Offered</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Detailed Profile Grid Layout */}
            <div className="profile-grid">
                {/* Main Column */}
                <div className="col-main">
                    {/* About Company */}
                    <section className="card p-28">
                        <h3 className="section-title">
                            <i className="ph ph-info text-accent"></i> About ABC Technologies
                        </h3>
                        <p className="text-content mt-12">
                            ABC Technologies is an enterprise innovation leader building high-throughput cloud infrastructure and generative AI fine-tuning platforms for over 500 enterprise customers globally. Through our structured campus outreach program, we collaborate directly with top engineering institutions to discover outstanding student developers, sponsor capstone labs, and host live competitive coding challenges.
                        </p>
                        
                        <h4 className="font-bold mt-24 mb-12" style={{ fontSize: '14px' }}>
                            Key Focus Areas &amp; Specializations
                        </h4>
                        <div className="tags">
                            <span className="tag">Generative AI &amp; LLM Orchestration</span>
                            <span className="tag">Distributed Cloud Architecture</span>
                            <span className="tag">Kubernetes &amp; SRE Systems</span>
                            <span className="tag">Big Data &amp; Real-Time Analytics</span>
                            <span className="tag">Enterprise Cyber Security</span>
                        </div>
                    </section>

                    {/* Hiring Tech Stack & Core Domains */}
                    <section className="card p-28">
                        <h3 className="section-title">
                            <i className="ph ph-code text-accent"></i> Primary Hiring Domains &amp; Tech Stacks
                        </h3>
                        <p className="subtitle mb-16">
                            Verified student skills matched against our engineering talent requirements.
                        </p>
                        
                        <div className="skill-focus-grid">
                            <div className="skill-focus-item">
                                <div className="skill-focus-header">
                                    <strong>Python &amp; Machine Learning (PyTorch / TensorFlow)</strong>
                                    <span className="badge badge-blue">High Priority</span>
                                </div>
                                <p>
                                    Seeking students with hands-on experience in LLM fine-tuning, embeddings, and mathematical foundations.
                                </p>
                            </div>
                            <div className="skill-focus-item">
                                <div className="skill-focus-header">
                                    <strong>Cloud &amp; DevOps (AWS, Docker, Kubernetes)</strong>
                                    <span className="badge badge-blue">High Priority</span>
                                </div>
                                <p>
                                    Seeking candidates proficient in container orchestration, CI/CD automation, and infrastructure as code.
                                </p>
                            </div>
                            <div className="skill-focus-item">
                                <div className="skill-focus-header">
                                    <strong>Full-Stack &amp; Web Platforms (React, Node.js, TypeScript)</strong>
                                    <span className="badge badge-gray">Active</span>
                                </div>
                                <p>
                                    Modern frontend development with high performance UI/UX systems and microservices integration.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Active University Partnerships & MoUs */}
                    <section className="card p-28">
                        <div className="card-header border-none p-0 mb-16" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 className="section-title" style={{ marginBottom: '4px' }}>
                                    <i className="ph ph-handshake text-accent"></i> Active Campus MoUs &amp; Collabs
                                </h3>
                                <p className="subtitle">
                                    Institutions where ABC Technologies actively runs hiring and research tracks.
                                </p>
                            </div>
                            <button className="btn btn-outline" type="button" onClick={() => alert('Initiating new campus MoU request...')}>
                                <i className="ph ph-plus"></i> Partner with College
                            </button>
                        </div>

                        <div className="mou-partner-list">
                            <div className="mou-card-item">
                                <div className="mou-logo-box">SSN</div>
                                <div className="mou-card-content">
                                    <div className="mou-card-top">
                                        <h5>SSN College of Engineering</h5>
                                        <span className="badge badge-success">Active MoU (2024–2027)</span>
                                    </div>
                                    <p className="text-muted" style={{ fontSize: '13px' }}>
                                        Joint GenAI &amp; Data Intelligence CoE Lab • 120 students enrolled in workshop • 14 campus internship offers.
                                    </p>
                                </div>
                            </div>

                            <div className="mou-card-item">
                                <div className="mou-logo-box" style={{ background: '#E0F2FE', color: '#0284C7' }}>MIT</div>
                                <div className="mou-card-content">
                                    <div className="mou-card-top">
                                        <h5>Madras Institute of Technology</h5>
                                        <span className="badge badge-success">Active MoU (2023–2026)</span>
                                    </div>
                                    <p className="text-muted" style={{ fontSize: '13px' }}>
                                        Annual Capstone Hackathon Title Sponsor • 8 live industry projects • 12 shortlisted candidates.
                                    </p>
                                </div>
                            </div>

                            <div className="mou-card-item">
                                <div className="mou-logo-box" style={{ background: '#F3E8FF', color: '#7C3AED' }}>PSG</div>
                                <div className="mou-card-content">
                                    <div className="mou-card-top">
                                        <h5>PSG College of Technology</h5>
                                        <span className="badge badge-success">Active MoU (2025–2028)</span>
                                    </div>
                                    <p className="text-muted" style={{ fontSize: '13px' }}>
                                        Faculty Sabbatical Program • Applied ML Research Grant ₹8.5 Lakhs co-funded.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Transparent Recruitment Workflow */}
                    <section className="card p-28">
                        <h3 className="section-title">
                            <i className="ph ph-steps text-accent"></i> Campus Recruitment Workflow
                        </h3>
                        <p className="subtitle mb-20">
                            Transparent 4-stage evaluation process for candidate selection.
                        </p>
                        <div className="workflow-steps-grid">
                            <div className="workflow-step">
                                <div className="step-num">1</div>
                                <h5>Skill Assessment</h5>
                                <p>BridgeX verified aptitude &amp; coding score verification.</p>
                            </div>
                            <div className="workflow-step">
                                <div className="step-num">2</div>
                                <h5>Hackathon / Task</h5>
                                <p>Hands-on 48hr domain project or coding problem.</p>
                            </div>
                            <div className="workflow-step">
                                <div className="step-num">3</div>
                                <h5>Technical Interview</h5>
                                <p>1-on-1 architecture &amp; problem solving discussion.</p>
                            </div>
                            <div className="workflow-step">
                                <div className="step-num">4</div>
                                <h5>Offer &amp; Onboarding</h5>
                                <p>Final selection, stipend confirmation &amp; mentor assign.</p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Side Column */}
                <div className="col-side">
                    {/* Recruiter Contact Card */}
                    <section className="card p-24">
                        <h3 className="section-title">
                            <i className="ph ph-user-circle text-accent"></i> Campus Talent Acquisition
                        </h3>
                        <div className="recruiter-profile mt-16">
                            <img
                                src="https://ui-avatars.com/api/?name=Vikram+Mehta&background=EFF6FF&color=1D4ED8&bold=true"
                                alt="Vikram Mehta"
                                className="avatar-lg"
                            />
                            <div>
                                <h4 className="font-bold">Vikram Mehta</h4>
                                <p className="text-muted" style={{ fontSize: '12.5px' }}>
                                    Head • Campus Relations &amp; Hiring
                                </p>
                            </div>
                        </div>
                        <ul className="contact-list mt-16">
                            <li><i className="ph ph-envelope-simple"></i> campus.hiring@abctech.demo</li>
                            <li><i className="ph ph-phone"></i> +91 (80) 4920-1100 / Ext 402</li>
                            <li><i className="ph ph-map-pin"></i> Electronic City Phase 1, Bengaluru 560100</li>
                        </ul>
                        <button
                            className="btn btn-outline w-100 mt-16"
                            type="button"
                            onClick={() => alert('Message sent to Campus Relations Lead!')}
                        >
                            <i className="ph ph-chat-circle-dots"></i> Message Recruiter
                        </button>
                    </section>

                    {/* Profile Completion Status */}
                    <section className="card p-24">
                        <h3 className="section-title">
                            <i className="ph ph-chart-donut text-accent"></i> Profile Completion
                        </h3>
                        <div className="completion-overview mt-16">
                            <div className="completion-score">92%</div>
                            <div>
                                <h4 className="font-bold">High Visibility</h4>
                                <p className="text-muted" style={{ fontSize: '13px' }}>
                                    Your company profile is featured at the top of partner campus boards.
                                </p>
                            </div>
                        </div>
                        <div className="progress-bar large mt-8">
                            <div className="progress-fill" style={{ width: '92%' }}></div>
                        </div>
                        
                        <ul className="completion-checklist mt-16">
                            <li><i className="ph-fill ph-check-circle text-success"></i> Corporate Overview Completed</li>
                            <li><i className="ph-fill ph-check-circle text-success"></i> Verified Partner Compliance</li>
                            <li><i className="ph-fill ph-check-circle text-success"></i> Key Tech Stacks Tagged</li>
                            <li><i className="ph-fill ph-circle text-muted"></i> Add Campus Life Video (Optional)</li>
                        </ul>
                    </section>

                    {/* Downloads & Quick Links */}
                    <section className="card p-24">
                        <h3 className="section-title">
                            <i className="ph ph-file-arrow-down text-accent"></i> Documents &amp; Policy
                        </h3>
                        <div className="profile-actions-list p-0 mt-16">
                            <button
                                className="profile-action-item"
                                type="button"
                                onClick={() => alert('Downloading Campus Hiring Policy 2026-27...')}
                            >
                                <span><i className="ph ph-file-pdf text-danger"></i> Campus Hiring Policy 2026</span>
                                <i className="ph ph-download-simple"></i>
                            </button>
                            <button
                                className="profile-action-item"
                                type="button"
                                onClick={() => alert('Downloading Internship Guidelines...')}
                            >
                                <span><i className="ph ph-file-text text-blue"></i> Internship Guidelines</span>
                                <i className="ph ph-download-simple"></i>
                            </button>
                            <button
                                className="profile-action-item"
                                type="button"
                                onClick={() => alert('Opening MoU Collaboration Form...')}
                            >
                                <span><i className="ph ph-handshake text-success"></i> MoU Template Proposal</span>
                                <i className="ph ph-arrow-square-out"></i>
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </section>
    );
}
