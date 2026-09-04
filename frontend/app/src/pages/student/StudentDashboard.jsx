import React from 'react';
import { Link } from 'react-router-dom';
import {
  applications,
  careerPaths,
  certifications,
  progressMetrics,
  projects,
  recommendedOpportunities,
  skills,
  studentProfile,
} from './studentPortalData';

export default function StudentDashboard() {
  const focusSkill = skills.find(skill => skill.attention) || skills[skills.length - 1];

  return (
    <main className="view-section active">
      <header className="page-header">
        <div className="header-text">
          <h1>Good morning, {studentProfile.firstName}</h1>
          <p>You're making solid progress. Here's what deserves your attention today.</p>
        </div>
        <Link className="btn btn-primary" to="/student/assessment">
          <i className="ph ph-target"></i>
          Continue Assessment
        </Link>
      </header>

      <section className="progress-section">
        <div className="progress-header">
          <h2>Your Career Progress</h2>
          <p className="encouragement">
            <i className="ph-fill ph-sparkle text-blue"></i>
            You're building a strong foundation. Improving Cloud and Data skills could increase your opportunity matches by 24%.
          </p>
        </div>

        <div className="metrics-grid">
          {progressMetrics.map(metric => (
            <div className="metric-block" key={metric.label}>
              <span className="metric-label">{metric.label}</span>
              <span className="metric-value">{metric.value}</span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${metric.progress}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="spaced-section">
        <div className="section-heading">
          <h2>Recommended for You</h2>
          <p className="section-sub">Opportunities that match your verified skills and interests.</p>
        </div>

        <div className="recommendation-grid">
          {recommendedOpportunities.map(item => (
            <article className={`opp-card ${item.event ? 'event-card' : ''}`} key={item.title}>
              <div className="opp-header">
                <span className={`match-badge ${item.event ? 'event-badge' : ''}`}>{item.match}</span>
                {!item.event && (
                  <button className="bookmark-btn" type="button" aria-label={`Save ${item.title}`}>
                    <i className="ph ph-bookmark-simple"></i>
                  </button>
                )}
              </div>
              <h3 className="opp-title">{item.title}</h3>
              <p className="opp-company">{item.company}</p>
              <div className="opp-tags">
                {item.tags.map(tag => <span key={tag}>{tag}</span>)}
              </div>
              <div className="opp-footer">
                {item.details.map((detail, index) => (
                  <span className="opp-detail" key={detail}>
                    <i className={`ph ${index === 0 ? 'ph-clock' : 'ph-map-pin'}`}></i>
                    {detail}
                  </span>
                ))}
              </div>
              <Link className={`btn ${item.event ? 'btn-primary' : 'btn-outline'} w-full mt-24`} to={item.event ? '/student/events' : '/student/opportunities'}>
                {item.action}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="two-col-section">
        <div className="skills-column">
          <div className="section-heading">
            <h2>Your Skills</h2>
            <p className="section-sub">See what you're strong at and where you can improve.</p>
          </div>

          <div className="clean-skill-list">
            {skills.map(skill => (
              <div className="skill-row" key={skill.name}>
                <div className="skill-info"><span>{skill.name}</span> <span className="skill-pct">{skill.score}%</span></div>
                <div className="progress-track">
                  <div className={`progress-fill ${skill.attention ? 'bg-amber' : ''}`} style={{ width: `${skill.score}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="gap-column">
          <div className="section-heading">
            <h2>Your Next Step</h2>
            <p className="section-sub">AI-identified focus area to boost employability.</p>
          </div>

          <div className="insight-card">
            <div className="insight-header">
              <h3>{focusSkill.name}</h3>
              <span className="insight-label"><i className="ph-fill ph-sparkle"></i> AI Insight</span>
            </div>

            <div className="gap-metrics">
              <div className="g-metric"><span>Your level</span><strong>{focusSkill.score}%</strong></div>
              <div className="g-metric"><span>Industry demand</span><strong>76%</strong></div>
              <div className="g-metric gap-highlight"><span>Gap</span><strong>{76 - focusSkill.score}%</strong></div>
            </div>

            <p className="insight-text">
              Cloud skills are frequently requested in the AI and Data internships you're interested in.
              Improving this skill could open significantly more opportunities.
            </p>

            <div className="insight-actions">
              <Link className="btn btn-primary" to="/student/learning">See Learning Options</Link>
              <Link className="btn btn-text" to="/student/opportunities">View Relevant Opportunities</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="spaced-section">
        <div className="section-heading">
          <h2>Career Paths That Fit You</h2>
          <p className="section-sub">Based on your skills and industry trends.</p>
        </div>

        <div className="career-path-list">
          {careerPaths.slice(0, 2).map(path => (
            <article className="path-item" key={path.title}>
              <div className="path-main">
                <h3>{path.title}</h3>
                <div className="path-match"><div className="dot bg-success"></div> {path.alignment}</div>
              </div>
              <div className="path-details">
                <div className="detail-group">
                  <span className="d-label">Strong match</span>
                  <span className="d-val">{path.strong}</span>
                </div>
                <div className="detail-group">
                  <span className="d-label">To improve</span>
                  <span className="d-val text-amber">{path.improve}</span>
                </div>
              </div>
              <Link className="btn btn-outline" to="/student/roadmap">Explore</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="two-col-section mb-64">
        <div>
          <div className="section-heading">
            <h2>Your Applications</h2>
          </div>
          <div className="clean-timeline">
            {applications.map((application, index) => (
              <div className={`tl-item ${index === applications.length - 1 ? 'pb-0 border-none' : ''}`} key={application.role}>
                <div className="tl-content">
                  <h4>{application.role} - <span className="fw-normal text-muted">{application.company}</span></h4>
                  <span className="tl-date">{application.date}</span>
                </div>
                <span className={`status-badge ${application.tone}`}>{application.status}</span>
              </div>
            ))}
          </div>
          <Link className="btn btn-text mt-16 pl-0" to="/student/applications">View All Applications <i className="ph ph-arrow-right"></i></Link>
        </div>

        <div>
          <div className="section-heading">
            <h2>Your Portfolio Preview</h2>
          </div>
          <div className="portfolio-preview-card">
            <div className="pp-stats">
              <div className="pp-stat"><span>Projects</span><strong>{projects.length}</strong></div>
              <div className="pp-stat"><span>Certifications</span><strong>{certifications.length}</strong></div>
              <div className="pp-stat"><span>Achievements</span><strong>4</strong></div>
              <div className="pp-stat"><span>Internships</span><strong>2</strong></div>
            </div>
            <div className="pp-actions">
              <Link className="btn btn-outline" to="/student/portfolio">Edit Portfolio</Link>
              <Link className="btn btn-text" to="/student/profile">Preview Public Profile</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
