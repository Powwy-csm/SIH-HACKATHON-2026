import React from 'react';
import { learningTracks } from './studentPortalData';

export default function StudentLearning() {
  return (
    <main className="view-section active">
      <header className="page-header">
        <div className="header-text">
          <h1>Learning</h1>
          <p>Focused learning paths based on your current skill gaps and target roles.</p>
        </div>
      </header>

      <div className="portal-grid">
        {learningTracks.map(track => (
          <article className="portal-card" key={track.title}>
            <div className="card-kicker">{track.focus}</div>
            <h3>{track.title}</h3>
            <p className="p-text">{track.lessons}</p>
            <div className="progress-track mt-16"><div className="progress-fill" style={{ width: `${track.progress}%` }}></div></div>
            <div className="card-actions">
              <button className="btn btn-primary" type="button">Continue</button>
              <button className="btn btn-text" type="button">View syllabus</button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
