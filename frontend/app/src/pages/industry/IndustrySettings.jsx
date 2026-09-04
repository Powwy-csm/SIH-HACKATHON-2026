import React, { useState } from 'react';

export default function IndustrySettings() {
    const [companyName, setCompanyName] = useState('ABC Technologies');
    const [email, setEmail] = useState('campus.hiring@abctech.demo');
    const [phone, setPhone] = useState('+91 (80) 4920-1100');
    const [notifyNewApps, setNotifyNewApps] = useState(true);
    const [notifyCollabs, setNotifyCollabs] = useState(true);
    const [saved, setSaved] = useState(false);

    const handleSave = (e) => {
        e.preventDefault();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <main className="dashboard-area">
            <div className="dashboard-header">
                <div>
                    <h2>Company Settings &amp; Preferences</h2>
                    <p className="subtitle">Manage recruiter credentials, campus notification preferences, and team access.</p>
                </div>
            </div>

            {saved && (
                <div style={{ padding: '12px 16px', marginBottom: '20px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                    Settings saved successfully!
                </div>
            )}

            <div className="dashboard-layout">
                <div className="col-main">
                    <section className="card p-28">
                        <h3 className="section-title">Corporate Information</h3>
                        <form onSubmit={handleSave} style={{ marginTop: '20px' }}>
                            <div className="form-grid">
                                <div className="form-group span-2">
                                    <label>Company Legal Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Campus Hiring Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Contact Phone</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: '24px' }}>
                                <button className="btn btn-primary" type="submit">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </section>
                </div>

                <div className="col-side">
                    <section className="card p-24">
                        <h3 className="section-title">Notification Alerts</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={notifyNewApps}
                                    onChange={(e) => setNotifyNewApps(e.target.checked)}
                                />
                                <span>Email alerts on new applications</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={notifyCollabs}
                                    onChange={(e) => setNotifyCollabs(e.target.checked)}
                                />
                                <span>University MoU request updates</span>
                            </label>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
