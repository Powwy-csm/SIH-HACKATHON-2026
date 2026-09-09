import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/apiClient';

const STATUS_LABEL = {
  applied:             'Applied',
  reviewing:           'Under Review',
  shortlisted:         'Shortlisted',
  interview_scheduled: 'Interview Scheduled',
  selected:            'Selected ✓',
  rejected:            'Not Selected',
};

const STATUS_TONE = {
  applied:             'status-blue',
  reviewing:           'status-neutral',
  shortlisted:         'status-blue',
  interview_scheduled: 'status-blue',
  selected:            'status-success',
  rejected:            'status-neutral',
};

const TYPE_LABEL = {
  internship:    'Internship',
  placement:     'Placement',
  apprenticeship:'Apprenticeship',
  training:      'Training',
  bootcamp:      'Bootcamp',
};

export default function StudentApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiFetch('/api/student/applications');
        if (mounted && data) {
          setApplications(data);
        }
      } catch (err) {
        console.error('StudentApplications load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user?.id]);

  const formatDate = (str) =>
    str ? new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <main className="view-section active">
      <header className="page-header">
        <div className="header-text">
          <h1>Your Applications</h1>
          <p>Track every opportunity from applied to interview and offer.</p>
        </div>
      </header>

      <section className="portal-card">
        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
            <i className="ph ph-circle-notch" style={{ fontSize: 36, display: 'block', marginBottom: 12 }}></i>
            Loading your applications…
          </div>
        ) : applications.length > 0 ? (
          <div className="clean-timeline">
            {applications.map((app, index) => {
              const company = app.company_name || app.postings?.companies?.name || 'Company';
              const role = app.posting_title || app.postings?.title || '—';
              const type = TYPE_LABEL[app.type] || app.type || '—';
              const loc = app.location || app.postings?.location;
              const stipend = app.stipend_text || app.postings?.stipend_text;
              return (
                <div
                  className={`tl-item ${index === applications.length - 1 ? 'pb-0 border-none' : ''}`}
                  key={app.id}
                >
                  <div className="tl-content">
                    <h4>
                      {role}{' '}
                      <span className="fw-normal text-muted">— {company}</span>
                    </h4>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4, fontSize: 12, color: '#64748B' }}>
                      <span><i className="ph ph-briefcase"></i> {type}</span>
                      {loc && <span><i className="ph ph-map-pin"></i> {loc}</span>}
                      {stipend && <span><i className="ph ph-currency-inr"></i> {stipend}</span>}
                    </div>
                    <span className="tl-date">{formatDate(app.applied_at)}</span>
                  </div>
                  <span className={`status-badge ${STATUS_TONE[app.status] || 'status-badge-gray'}`}>
                    {STATUS_LABEL[app.status] || app.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center', background: '#F8FAFC', borderRadius: 8 }}>
            <i className="ph ph-paper-plane-tilt" style={{ fontSize: 40, color: '#94A3B8', marginBottom: 12, display: 'inline-block' }}></i>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#1E293B' }}>No applications submitted yet</h3>
            <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 20px 0', maxWidth: 450, marginInline: 'auto' }}>
              When you apply to internship, placement, training, or bootcamp postings on BridgeX, you can track your application status here.
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
