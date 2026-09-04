import React from 'react';
import { careerPaths, roadmapSteps } from './studentPortalData';

export default function StudentRoadmap() {
  return (
    <main className="view-section active">
      <header className="page-header">
        <div className="header-text">
          <h1>Career Roadmap</h1>
          <p>A practical path from your current profile to internship-ready confidence.</p>
        </div>
      </header>

      <section className="spaced-section">
        <div className="career-path-list">
          {careerPaths.map(path => (
            <article className="path-item" key={path.title}>
              <div className="path-main">
                <h3>{path.title}</h3>
                <div className="path-match"><div className="dot bg-success"></div> {path.alignment}</div>
              </div>
              <div className="path-details">
                <div className="detail-group"><span className="d-label">Strong match</span><span className="d-val">{path.strong}</span></div>
                <div className="detail-group"><span className="d-label">To improve</span><span className="d-val text-amber">{path.improve}</span></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="portal-card">
        <div className="section-heading">
          <h2>Next Milestones</h2>
          <p className="section-sub">Complete these in sequence for the strongest placement profile.</p>
        </div>
        <div className="roadmap-list">
          {roadmapSteps.map((step, index) => (
            <div className="roadmap-item" key={step.title}>
              <div className="roadmap-number">{index + 1}</div>
              <div>
                <h3>{step.title}</h3>
                <p className="p-text">{step.detail}</p>
              </div>
              <span className="status-badge status-neutral">{step.status}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
