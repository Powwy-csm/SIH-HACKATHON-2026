import React from 'react';
import { applications } from './studentPortalData';

export default function StudentApplications() {
  return (
    <main className="view-section active">
      <header className="page-header">
        <div className="header-text">
          <h1>Your Applications</h1>
          <p>Track every opportunity from applied to interview and offer.</p>
        </div>
        <button className="btn btn-outline" type="button"><i className="ph ph-download-simple"></i> Export</button>
      </header>

      <section className="portal-card">
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
      </section>
    </main>
  );
}
