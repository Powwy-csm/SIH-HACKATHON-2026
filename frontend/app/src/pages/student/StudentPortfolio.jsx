import React from 'react';
import { certifications, projects, skills, studentProfile } from './studentPortalData';

export default function StudentPortfolio() {
  return (
    <main className="view-section active">
      <header className="page-header">
        <div className="header-text">
          <h1>Portfolio</h1>
          <p>Your verified projects, certificates, skills, and achievements in one place.</p>
        </div>
        <button className="btn btn-primary" type="button"><i className="ph ph-eye"></i> Preview Public Profile</button>
      </header>

      <section className="portfolio-preview-card spaced-section">
        <div className="pp-stats">
          <div className="pp-stat"><span>Projects</span><strong>{projects.length}</strong></div>
          <div className="pp-stat"><span>Certifications</span><strong>{certifications.length}</strong></div>
          <div className="pp-stat"><span>Achievements</span><strong>4</strong></div>
          <div className="pp-stat"><span>Internships</span><strong>2</strong></div>
        </div>
        <p className="p-text">{studentProfile.about}</p>
      </section>

      <div className="profile-layout">
        <section className="p-section">
          <h2>Project Showcase</h2>
          <div className="project-list">
            {projects.map(project => (
              <article className="project-item portal-card compact-card" key={project.title}>
                <h3>{project.title}</h3>
                <span className="p-date">{project.date}</span>
                <p className="p-text">{project.description}</p>
                <div className="p-tags">
                  {project.tags.map(tag => <span key={tag}>{tag}</span>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="p-section">
          <h2>Verified Skills</h2>
          <div className="skill-tags">
            {skills.map(skill => (
              <span className={`s-tag ${skill.verified ? 'verified' : ''}`} key={skill.name}>
                {skill.name} {skill.verified && <i className="ph-fill ph-check-circle"></i>}
              </span>
            ))}
          </div>
          <h2 className="mt-24">Certifications</h2>
          <ul className="clean-list">
            {certifications.map(cert => (
              <li key={cert.title}>
                <strong>{cert.title}</strong>
                <span>{cert.issuer} - {cert.date}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
