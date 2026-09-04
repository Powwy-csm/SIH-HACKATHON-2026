import React from 'react';

const EVENTS = [
    {
        id: 1,
        day: '24',
        month: 'Aug',
        title: 'AI & Cloud Infrastructure Workshop',
        college: 'SSN College of Engineering',
        time: '10:00 AM - 1:00 PM IST',
        enrolled: '120 students',
        status: 'Upcoming',
        statusBadge: 'badge-blue',
    },
    {
        id: 2,
        day: '02',
        month: 'Sep',
        title: 'Industry Project Challenge 2026',
        college: 'ABC Tech × MIT CSE Department',
        time: '48-Hour Hackathon',
        enrolled: '45 teams',
        status: 'Registration Open',
        statusBadge: 'badge-success',
    },
    {
        id: 3,
        day: '18',
        month: 'Sep',
        title: 'Masterclass: Distributed Systems in Production',
        college: 'PSG College of Technology',
        time: '3:00 PM - 5:00 PM IST',
        enrolled: '95 students',
        status: 'Scheduled',
        statusBadge: 'badge-gray',
    },
];

export default function IndustryEvents() {
    return (
        <main className="dashboard-area">
            <div className="dashboard-header">
                <div>
                    <h2>Learning Workshops &amp; Campus Events</h2>
                    <p className="subtitle">Host technical workshops, sponsor student hackathons, and deliver guest lectures.</p>
                </div>
                <button className="btn btn-primary" type="button" onClick={() => alert('Opening new Workshop Creation wizard...')}>
                    <i className="ph ph-plus"></i> Host New Workshop / Event
                </button>
            </div>

            <section className="card">
                <div className="card-header">
                    <h3>Upcoming Campus Events ({EVENTS.length})</h3>
                </div>
                <div className="collab-events" style={{ padding: '24px' }}>
                    {EVENTS.map(ev => (
                        <div className="event-item" key={ev.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
                            <div className="event-date">
                                <span className="day">{ev.day}</span>
                                <span className="month">{ev.month}</span>
                            </div>
                            <div className="event-details" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <h5 style={{ fontSize: '15px' }}>{ev.title}</h5>
                                    <span className={`badge ${ev.statusBadge}`}>{ev.status}</span>
                                </div>
                                <p style={{ fontSize: '13px', marginTop: '4px' }}>{ev.college} • {ev.time} • Enrolled: <strong>{ev.enrolled}</strong></p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-outline" type="button" onClick={() => alert(`Managing attendees for ${ev.title}...`)}>
                                    Manage Attendees
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
