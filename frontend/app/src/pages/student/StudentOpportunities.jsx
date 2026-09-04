import React, { useMemo, useState } from 'react';
import { opportunityList } from './studentPortalData';

export default function StudentOpportunities() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [location, setLocation] = useState('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunityList.filter(item => {
      const matchesQuery = !q || [item.title, item.company, ...item.tags].some(value => value.toLowerCase().includes(q));
      const matchesType = type === 'All' || item.type === type;
      const matchesLocation = location === 'All' || item.location.toLowerCase().includes(location.toLowerCase());
      return matchesQuery && matchesType && matchesLocation;
    });
  }, [query, type, location]);

  return (
    <main className="view-section active">
      <header className="page-header">
        <div className="header-text">
          <h1>Discover Opportunities</h1>
          <p>Internships, live projects, and programs tailored to your skills.</p>
        </div>
      </header>

      <div className="opp-filters">
        <div className="search-wrap flex-grow">
          <i className="ph ph-magnifying-glass"></i>
          <input value={query} onChange={(event) => setQuery(event.target.value)} type="text" placeholder="Search by role, company, or skill..." />
        </div>
        <select className="clean-select" value={type} onChange={(event) => setType(event.target.value)}>
          <option>All</option>
          <option>Internship</option>
          <option>Full-time</option>
        </select>
        <select className="clean-select" value={location} onChange={(event) => setLocation(event.target.value)}>
          <option>All</option>
          <option>Remote</option>
          <option>Chennai</option>
          <option>Bengaluru</option>
        </select>
        <button className="btn btn-outline" type="button"><i className="ph ph-sliders-horizontal"></i> Filters</button>
      </div>

      <div className="opp-list-vertical">
        {filtered.map(item => (
          <article className="opp-list-card" key={item.title}>
            <div className="olc-main">
              <h3>{item.title}</h3>
              <p className="company">{item.company}</p>
              <div className="olc-meta">
                <span><i className="ph ph-briefcase"></i> {item.type}</span>
                <span><i className="ph ph-map-pin"></i> {item.location}</span>
                <span><i className="ph ph-clock"></i> {item.duration}</span>
              </div>
              <div className="olc-tags">
                {item.tags.map(tag => <span key={tag}>{tag}</span>)}
              </div>
            </div>
            <div className="olc-side">
              <div className="match-score">
                <span className="score">{item.match}</span>
                {item.missing && <span className="missing">{item.missing}</span>}
              </div>
              <div className="olc-actions">
                <button className="btn btn-outline" type="button">View Details</button>
                <button className="btn btn-primary" type="button">Apply Now</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
