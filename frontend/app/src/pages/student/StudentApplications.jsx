import React from 'react';
import { Link } from 'react-router-dom';

export default function StudentApplications() {
  const applications = [];

  return (
    <main className="view-section active">
      <header className="page-header">
        <div className="header-text">
          <h1>Your Applications</h1>
          <p>Track every opportunity from applied to interview and offer.</p>
        </div>
      </header>

      <section className="portal-card">
        {applications.length > 0 ? (
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
        ) : (
          <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center', background: '#F8FAFC', borderRadius: 8 }}>
            <i className="ph ph-paper-plane-tilt" style={{ fontSize: 40, color: '#94A3B8', marginBottom: 12, display: 'inline-block' }}></i>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#1E293B' }}>No applications submitted yet</h3>
            <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 20px 0', maxWidth: 450, marginInline: 'auto' }}>
              When you apply to internship postings with your verified BridgeX skill profile, you can track your application review status and interview invitations here.
            </p>
            <Link className="btn btn-primary" to="/student/opportunities">
              Explore Opportunities
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
