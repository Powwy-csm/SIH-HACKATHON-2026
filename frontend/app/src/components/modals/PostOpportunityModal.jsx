import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/apiClient';

const PERK_OPTIONS = [
    { id: 'ppo', label: 'Pre-Placement Offer', icon: 'ph ph-certificate' },
    { id: 'certificate', label: 'Certificate of Excellence', icon: 'ph ph-medal' },
    { id: 'laptop', label: 'Laptop Provided', icon: 'ph ph-device-mobile' },
    { id: 'relocation', label: 'Relocation Support', icon: 'ph ph-airplane' },
    { id: 'mentorship', label: 'Mentorship Program', icon: 'ph ph-chalkboard-teacher' },
    { id: 'insurance', label: 'Health Insurance', icon: 'ph ph-activity' },
    { id: 'meals', label: 'Meal Allowance', icon: 'ph ph-food' },
    { id: 'fast_track', label: 'Fast-Track Full-Time Conversion', icon: 'ph ph-trend-up' },
];

const OPP_TYPES = [
    { value: 'internship',    label: 'Internship',    icon: 'ph ph-student' },
    { value: 'placement',     label: 'Full-time Job', icon: 'ph ph-briefcase' },
    { value: 'apprenticeship',label: 'Apprenticeship',icon: 'ph ph-graduation-cap' },
    { value: 'training',      label: 'Training',      icon: 'ph ph-chalkboard-teacher' },
    { value: 'bootcamp',      label: 'Bootcamp',      icon: 'ph ph-lightning' },
];

export default function PostOpportunityModal({ onClose, onPublish, companyId }) {
    const { user } = useAuth();
    const [oppType, setOppType] = useState('internship');
    const [title, setTitle] = useState('');
    const [department, setDepartment] = useState('');
    const [openings, setOpenings] = useState('');
    const [description, setDescription] = useState('');
    
    // Skills
    const [skills, setSkills] = useState([]);
    const [skillInput, setSkillInput] = useState('');
    
    // Requirements
    const [qualification, setQualification] = useState('B.E. / B.Tech');
    const [experience, setExperience] = useState('Fresher / 0 Years');
    const [cgpa, setCgpa] = useState('');
    const [targetDept, setTargetDept] = useState('All Departments');
    
    // Logistics
    const [location, setLocation] = useState('');
    const [workMode, setWorkMode] = useState('On-site');
    const [duration, setDuration] = useState('');
    const [stipend, setStipend] = useState('');
    const [deadline, setDeadline] = useState('');
    const [startDate, setStartDate] = useState('');
    
    // Perks selection
    const [selectedPerks, setSelectedPerks] = useState(['ppo', 'certificate']);
    const [notification, setNotification] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleAddSkill = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = skillInput.trim();
            if (!val) return;
            if (skills.some(s => s.toLowerCase() === val.toLowerCase())) {
                setSkillInput('');
                return;
            }
            setSkills(prev => [...prev, val]);
            setSkillInput('');
        }
    };

    const handleRemoveSkill = (skillToRemove) => {
        setSkills(prev => prev.filter(s => s !== skillToRemove));
    };

    const togglePerk = (perkId) => {
        setSelectedPerks(prev =>
            prev.includes(perkId) ? prev.filter(p => p !== perkId) : [...prev, perkId]
        );
    };

    const modeMap = { 'On-site': 'on-site', 'Remote': 'remote', 'Hybrid': 'hybrid' };

    const handleSaveDraft = async () => {
        await saveToDb('closed');
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        await saveToDb('open');
    };

    const saveToDb = async (status) => {
        if (!title.trim()) {
            setError('Please enter a title.');
            return;
        }
        setSaving(true);
        setError('');

        try {
            const payload = {
                title: title.trim(),
                department: department || null,
                type: oppType,
                status,
                description: description || null,
                location: location || null,
                mode: modeMap[workMode] || 'on-site',
                duration_months: duration ? parseFloat(duration) : null,
                stipend_text: stipend || null,
                eligibility_criteria: [
                    qualification,
                    experience,
                    cgpa ? `Min CGPA: ${cgpa}` : null,
                    `Target: ${targetDept}`,
                ].filter(Boolean).join(' | ') || null,
                openings: openings ? parseInt(openings, 10) : 1,
                application_deadline: deadline || null,
                skills_list: skills,
            };

            const data = await apiFetch('/api/industry/opportunities', {
                method: 'POST',
                body: payload,
            });

            setNotification(
                status === 'open'
                    ? 'Opportunity published! Students can now see and apply.'
                    : 'Draft saved successfully!'
            );
            setTimeout(() => {
                if (onPublish) onPublish(data);
                if (onClose) onClose();
            }, 600);
        } catch (err) {
            console.error('saveToDb error:', err);
            setError(err.message || 'Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay industry-modal" style={{ display: 'flex' }} onClick={onClose}>
            <div className="modal-container modal-wide" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Post New Opportunity</h2>
                        <p className="subtitle" style={{ marginTop: '4px', fontSize: '13px' }}>
                            Fill in the details below to publish a new role, internship, training, or bootcamp to BridgeX partner campuses.
                        </p>
                    </div>
                    <button className="icon-btn close-modal" onClick={onClose} type="button">
                        <i className="ph ph-x"></i>
                    </button>
                </div>

                <div className="modal-body">
                    {notification && (
                        <div style={{
                            padding: '12px 16px',
                            marginBottom: '16px',
                            background: '#DCFCE7',
                            color: '#16A34A',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '13.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <i className="ph-fill ph-check-circle"></i>
                            {notification}
                        </div>
                    )}
                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            marginBottom: '16px',
                            background: '#FEE2E2',
                            color: '#DC2626',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '13.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <i className="ph ph-warning-circle"></i>
                            {error}
                        </div>
                    )}

                    <form id="postOpportunityForm" onSubmit={handleSubmit}>
                        <div className="form-grid">
                            {/* Opportunity Type */}
                            <div className="form-group span-2">
                                <label>Opportunity Type</label>
                                <div className="radio-group">
                                    {OPP_TYPES.map(({ value, label, icon }) => (
                                        <label className="radio-card" key={value}>
                                            <input
                                                type="radio"
                                                name="opp_type"
                                                value={value}
                                                checked={oppType === value}
                                                onChange={() => setOppType(value)}
                                            />
                                            <span className="radio-content">
                                                <i className={icon}></i>
                                                {label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Basic Info */}
                            <div className="form-group span-2" style={{ marginTop: '8px' }}>
                                <p className="form-section-header">Basic Information</p>
                            </div>

                            <div className="form-group span-2">
                                <label htmlFor="title">Role / Opportunity Title</label>
                                <input
                                    type="text"
                                    id="title"
                                    placeholder="e.g. Machine Learning Engineer Intern"
                                    className="form-control"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="department">Department / Team</label>
                                <input
                                    type="text"
                                    id="department"
                                    placeholder="e.g. AI Research, Cloud Engineering"
                                    className="form-control"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="openings">Number of Openings</label>
                                <input
                                    type="number"
                                    id="openings"
                                    placeholder="e.g. 5"
                                    min="1"
                                    className="form-control"
                                    value={openings}
                                    onChange={(e) => setOpenings(e.target.value)}
                                />
                            </div>

                            <div className="form-group span-2">
                                <label htmlFor="description">Job Description &amp; Responsibilities</label>
                                <textarea
                                    id="description"
                                    rows="3"
                                    placeholder="Describe the role, day-to-day responsibilities, and what the candidate will build or achieve..."
                                    className="form-control"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                ></textarea>
                            </div>

                            {/* Requirements */}
                            <div className="form-group span-2" style={{ marginTop: '8px' }}>
                                <p className="form-section-header">Requirements</p>
                            </div>

                            <div className="form-group span-2">
                                <label>
                                    Required Skills <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>— type and press Enter</span>
                                </label>
                                <div className="skills-input-wrap" id="skillTagsWrap">
                                    {skills.map(skill => (
                                        <span className="skill-tag" key={skill}>
                                            {skill}{' '}
                                            <button type="button" onClick={() => handleRemoveSkill(skill)}>
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        id="skillInput"
                                        placeholder="Add a skill..."
                                        style={{ border: 'none', outline: 'none', flex: 1, minWidth: '120px', fontSize: '13px', background: 'transparent' }}
                                        value={skillInput}
                                        onChange={(e) => setSkillInput(e.target.value)}
                                        onKeyDown={handleAddSkill}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="qualification">Minimum Qualification</label>
                                <select
                                    id="qualification"
                                    className="form-control"
                                    value={qualification}
                                    onChange={(e) => setQualification(e.target.value)}
                                >
                                    <option>B.E. / B.Tech</option>
                                    <option>M.E. / M.Tech</option>
                                    <option>B.Sc / M.Sc</option>
                                    <option>MBA / Management</option>
                                    <option>Any Degree</option>
                                    <option>No Degree Required</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="experience">Experience Level</label>
                                <select
                                    id="experience"
                                    className="form-control"
                                    value={experience}
                                    onChange={(e) => setExperience(e.target.value)}
                                >
                                    <option>Fresher / 0 Years</option>
                                    <option>0–1 Year</option>
                                    <option>1–3 Years</option>
                                    <option>3–5 Years</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="cgpa">Minimum CGPA (optional)</label>
                                <input
                                    type="number"
                                    id="cgpa"
                                    placeholder="e.g. 7.5"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    className="form-control"
                                    value={cgpa}
                                    onChange={(e) => setCgpa(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="target_dept">Target Departments</label>
                                <select
                                    id="target_dept"
                                    className="form-control"
                                    value={targetDept}
                                    onChange={(e) => setTargetDept(e.target.value)}
                                >
                                    <option>All Departments</option>
                                    <option>Computer Science &amp; Engineering</option>
                                    <option>Information Technology</option>
                                    <option>Electronics &amp; Communication</option>
                                    <option>Mechanical / Civil</option>
                                </select>
                            </div>

                            {/* Logistics */}
                            <div className="form-group span-2" style={{ marginTop: '8px' }}>
                                <p className="form-section-header">Logistics &amp; Compensation</p>
                            </div>

                            <div className="form-group">
                                <label htmlFor="location">Location</label>
                                <input
                                    type="text"
                                    id="location"
                                    placeholder="e.g. Bengaluru / Remote"
                                    className="form-control"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="work_mode">Work Mode</label>
                                <select
                                    id="work_mode"
                                    className="form-control"
                                    value={workMode}
                                    onChange={(e) => setWorkMode(e.target.value)}
                                >
                                    <option>On-site</option>
                                    <option>Remote</option>
                                    <option>Hybrid</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="duration">Duration / Notice Period</label>
                                <input
                                    type="text"
                                    id="duration"
                                    placeholder="e.g. 6 Months / Full-time"
                                    className="form-control"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="stipend">Stipend / Salary (CTC)</label>
                                <input
                                    type="text"
                                    id="stipend"
                                    placeholder="e.g. ₹20,000/month or ₹8–12 LPA"
                                    className="form-control"
                                    value={stipend}
                                    onChange={(e) => setStipend(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="deadline">Application Deadline</label>
                                <input
                                    type="date"
                                    id="deadline"
                                    className="form-control"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="start_date">Expected Start Date</label>
                                <input
                                    type="month"
                                    id="start_date"
                                    className="form-control"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            {/* Perks */}
                            <div className="form-group span-2" style={{ marginTop: '8px' }}>
                                <p className="form-section-header">
                                    Perks &amp; Benefits{' '}
                                    <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>
                                        — click to select
                                    </span>
                                </p>
                            </div>
                            <div className="form-group span-2">
                                <div className="perk-grid">
                                    {PERK_OPTIONS.map(perk => (
                                        <span
                                            key={perk.id}
                                            className={`perk-chip ${selectedPerks.includes(perk.id) ? 'selected' : ''}`}
                                            onClick={() => togglePerk(perk.id)}
                                        >
                                            <i className={perk.icon}></i> {perk.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-outline close-modal" onClick={onClose} disabled={saving}>
                        Cancel
                    </button>
                    <button type="button" className="btn btn-outline" onClick={handleSaveDraft} disabled={saving}>
                        <i className="ph ph-floppy-disk"></i> Save Draft
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                        {saving ? (
                            <><i className="ph ph-circle-notch" style={{ animation: 'spin 1s linear infinite' }}></i> Saving...</>
                        ) : (
                            <><i className="ph ph-paper-plane-tilt"></i> Publish Opportunity</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}