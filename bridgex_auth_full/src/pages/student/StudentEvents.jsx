import React from 'react';
import { events } from './studentPortalData';

export default function StudentEvents() {
  return (
    <main className="view-section active">
      <header className="page-header">
        <div className="header-text">
          <h1>Events</h1>
          <p>Workshops, panels, and campus activities matched to your goals.</p>
        </div>
      </header>

      <div className="opp-list-vertical">
        {events.map(event => (
          <article className="opp-list-card" key={event.title}>
            <div className="olc-main">
              <h3>{event.title}</h3>
              <p className="company">{event.host}</p>
              <div className="olc-meta">
                <span><i className="ph ph-calendar"></i> {event.date}</span>
                <span><i className="ph ph-map-pin"></i> {event.mode}</span>
              </div>
            </div>
            <div className="olc-side">
              <span className={`status-badge ${event.status === 'Registered' ? 'status-blue' : 'status-neutral'}`}>{event.status}</span>
              <button className="btn btn-primary" type="button">{event.status === 'Registered' ? 'View Details' : 'Register'}</button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
