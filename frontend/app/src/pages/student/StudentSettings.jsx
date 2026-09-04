import React, { useState } from 'react';
import { studentProfile } from './studentPortalData';

export default function StudentSettings() {
  const [settings, setSettings] = useState({
    opportunityAlerts: true,
    profileVisible: true,
    weeklyDigest: true,
    interviewReminders: false,
  });

  const toggle = (key) => {
    setSettings(previous => ({ ...previous, [key]: !previous[key] }));
  };

  return (
    <main className="view-section active">
      <header className="page-header">
        <div className="header-text">
          <h1>Settings</h1>
          <p>Manage your profile visibility, notifications, and portal preferences.</p>
        </div>
        <button className="btn btn-primary" type="button">Save Changes</button>
      </header>

      <div className="settings-grid">
        <section className="portal-card">
          <div className="section-heading">
            <h2>Account</h2>
            <p className="section-sub">{studentProfile.name} - {studentProfile.college}</p>
          </div>
          <label className="form-row">
            <span>Display name</span>
            <input type="text" defaultValue={studentProfile.name} />
          </label>
          <label className="form-row">
            <span>Career headline</span>
            <input type="text" defaultValue={studentProfile.headline} />
          </label>
        </section>

        <section className="portal-card">
          <div className="section-heading">
            <h2>Preferences</h2>
            <p className="section-sub">Choose what BridgeX should surface for you.</p>
          </div>
          {Object.entries(settings).map(([key, enabled]) => (
            <button className="settings-row" type="button" key={key} onClick={() => toggle(key)}>
              <span>{labels[key]}</span>
              <span className={`toggle ${enabled ? 'on' : ''}`}><span></span></span>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}

const labels = {
  opportunityAlerts: 'Opportunity alerts',
  profileVisible: 'Public profile visible to recruiters',
  weeklyDigest: 'Weekly learning digest',
  interviewReminders: 'Interview reminders',
};
