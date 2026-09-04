import React from 'react';
import { Link } from 'react-router-dom';
import { careerInterests, certifications, projects, skills, studentProfile } from './studentPortalData';

export default function StudentProfile() {
  return (
    <main className="view-section active">
      <div className="profile-hero">
        <div className="ph-avatar">
          <img src={studentProfile.avatar} alt={studentProfile.name} />
        </div>
        <div className="ph-info">
          <h1>{studentProfile.name}</h1>
          <p className="ph-headline">{studentProfile.headline}</p>
          <span className="open-badge">{studentProfile.status}</span>
        </div>
        <div className="ph-actions">
          <Link className="btn btn-outline" to="/student/portfolio">Preview Public Profile</Link>
          <button className="btn btn-primary" type="button"><i className="ph ph-pencil-simple"></i> Edit Profile</button>
        </div>
      </div>

      <div className="profile-layout">
        <div className="p-main">
          <section className="p-section">
            <h2>About Me</h2>
            <p className="p-text">{studentProfile.about}</p>
          </section>

          <section className="p-section">
            <h2>Projects</h2>
            <div className="project-list">
              {projects.slice(0, 2).map(project => (
                <article className="project-item" key={project.title}>
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

          <section className="p-section">
            <h2>Education</h2>
            <div className="edu-item">
              <h3>{studentProfile.education.institution}</h3>
              <p className="degree">{studentProfile.degree}</p>
              <span className="p-date">{studentProfile.education.period} - CGPA: {studentProfile.education.cgpa}</span>
            </div>
          </section>
        </div>

        <aside className="p-side">
          <section className="p-section">
            <h2>Top Skills</h2>
            <div className="skill-tags">
              {skills.map(skill => (
                <span className={`s-tag ${skill.verified ? 'verified' : ''}`} key={skill.name}>
                  {skill.name} {skill.verified && <i className="ph-fill ph-check-circle"></i>}
                </span>
              ))}
            </div>
          </section>

          <section className="p-section">
            <h2>Certifications</h2>
            <ul className="clean-list">
              {certifications.slice(0, 2).map(cert => (
                <li key={cert.title}>
                  <strong>{cert.title}</strong>
                  <span>{cert.issuer} - {cert.date}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="p-section">
            <h2>Career Interests</h2>
            <ul className="clean-list">
              {careerInterests.map(interest => <li key={interest}>{interest}</li>)}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
