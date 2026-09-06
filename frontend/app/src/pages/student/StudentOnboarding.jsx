import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const STEPS = [
  'basic_info',
  'domain_selection',
  'skills',
  'assessment',
  'complete',
];

function StepIndicator({ currentStep }) {
  const labels = ['Basic Info', 'Domain', 'Skills', 'Assessment', 'Done'];
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', justifyContent: 'center' }}>
      {labels.map((label, i) => {
        const idx = STEPS.indexOf(STEPS[i]);
        const current = STEPS.indexOf(currentStep);
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: done ? '#10b981' : active ? '#6366f1' : '#e5e7eb',
              color: done || active ? '#fff' : '#6b7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.8rem',
            }}>
              {done ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: '0.8rem', color: active ? '#6366f1' : '#6b7280' }}>{label}</span>
            {i < labels.length - 1 && <span style={{ color: '#d1d5db' }}>→</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function StudentOnboarding() {
  const { user, session, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('basic_info');
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState('');
  const [config, setConfig] = useState({ domains: [], subdomains: [], fields_of_interest: [], skill_categories: [], skills: [] });

  // Form state
  const [bio, setBio] = useState('');
  const [domainId, setDomainId] = useState('');
  const [subdomainId, setSubdomainId] = useState('');
  const [interestId, setInterestId] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]); // [{skill_id, proficiency}]
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [assessmentScore, setAssessmentScore] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const token = session?.access_token;

  const apiFetch = async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
  };

  useEffect(() => {
    if (!token) return;
    apiFetch('/api/onboarding/config')
      .then(setConfig)
      .catch(e => setConfigError(e.message));
  }, [token]);

  // Derived lists
  const filteredSubdomains = config.subdomains.filter(s => s.domain_id === domainId);
  const filteredInterests = config.fields_of_interest.filter(f => f.subdomain_id === subdomainId);
  const groupedSkills = config.skill_categories.map(cat => ({
    ...cat,
    skills: config.skills.filter(s => s.category_id === cat.id),
  })).filter(cat => cat.skills.length > 0);

  const toggleSkill = (skillId) => {
    setSelectedSkills(prev => {
      const exists = prev.find(s => s.skill_id === skillId);
      if (exists) return prev.filter(s => s.skill_id !== skillId);
      return [...prev, { skill_id: skillId, proficiency: 'beginner' }];
    });
  };

  const setSkillProficiency = (skillId, proficiency) => {
    setSelectedSkills(prev =>
      prev.map(s => s.skill_id === skillId ? { ...s, proficiency } : s)
    );
  };

  const handleSaveOnboarding = async () => {
    setLoading(true);
    setSubmitError('');
    try {
      const saveRes = await apiFetch('/api/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify({
          bio,
          domain_id: domainId || null,
          subdomain_id: subdomainId || null,
          interest_id: interestId || null,
          skills: selectedSkills,
        }),
      });
      console.log("POST ONBOARDING RESPONSE:", saveRes);

      // Refresh AuthContext user state from DB source of truth
      if (refreshUser) await refreshUser();

      // Load assessment questions
      const params = interestId ? `?interest_id=${interestId}` : '';
      const qData = await apiFetch(`/api/onboarding/assessment${params}`);
      setQuestions(qData.questions || []);
      setStep('assessment');
    } catch (e) {
      setSubmitError(`Failed to save: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssessment = async () => {
    setLoading(true);
    setSubmitError('');
    try {
      const formattedAnswers = Object.entries(answers).map(([question_id, selected_index]) => ({
        question_id,
        selected_index,
      }));
      const result = await apiFetch('/api/onboarding/assessment', {
        method: 'POST',
        body: JSON.stringify({
          interest_id: interestId || null,
          answers: formattedAnswers,
        }),
      });
      setAssessmentScore(result.score);
      if (refreshUser) await refreshUser();
      setStep('complete');
    } catch (e) {
      setSubmitError(`Assessment failed: ${e.message}. Your profile has already been saved.`);
      setStep('complete');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    console.log("NAVIGATION TARGET:", "/student/dashboard");
    if (refreshUser) await refreshUser();
    navigate('/student/dashboard');
  };


  const cardStyle = {
    maxWidth: 720,
    margin: '2rem auto',
    background: '#fff',
    borderRadius: 16,
    padding: '2rem',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    fontFamily: 'system-ui, sans-serif',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: '0.95rem',
    marginTop: '0.25rem',
    boxSizing: 'border-box',
  };

  const btnPrimary = {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '0.625rem 1.5rem',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.95rem',
  };

  const btnSecondary = {
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: 8,
    padding: '0.625rem 1.5rem',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.95rem',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '1rem' }}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>
            Welcome to BridgeX 👋
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
            Let's set up your student profile — it only takes a few minutes.
          </p>
        </div>

        <StepIndicator currentStep={step} />

        {configError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', color: '#dc2626' }}>
            ⚠️ Could not load configuration: {configError}
          </div>
        )}

        {submitError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', color: '#dc2626' }}>
            {submitError}
          </div>
        )}

        {/* STEP 1: Basic Info */}
        {step === 'basic_info' && (
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#374151' }}>
              Basic Information
            </h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, color: '#374151' }}>Your Name</label>
              <input
                style={inputStyle}
                type="text"
                value={user?.full_name || ''}
                readOnly
                placeholder="From your account"
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, color: '#374151' }}>Email</label>
              <input
                style={inputStyle}
                type="email"
                value={user?.email || ''}
                readOnly
                placeholder="From your account"
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 500, color: '#374151' }}>
                About You <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Brief description about yourself, your goals, etc."
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button style={btnSecondary} onClick={() => logout()}>Sign Out</button>
              <button style={btnPrimary} onClick={() => setStep('domain_selection')}>Next →</button>
            </div>
          </div>
        )}

        {/* STEP 2: Domain Selection */}
        {step === 'domain_selection' && (
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#374151' }}>
              Your Academic Domain
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, color: '#374151' }}>Domain</label>
              <select
                style={inputStyle}
                value={domainId}
                onChange={e => { setDomainId(e.target.value); setSubdomainId(''); setInterestId(''); }}
              >
                <option value="">Select domain...</option>
                {config.domains.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {domainId && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 500, color: '#374151' }}>Subdomain</label>
                <select
                  style={inputStyle}
                  value={subdomainId}
                  onChange={e => { setSubdomainId(e.target.value); setInterestId(''); }}
                >
                  <option value="">Select subdomain...</option>
                  {filteredSubdomains.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {filteredSubdomains.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    No subdomains yet for this domain. You can still continue.
                  </p>
                )}
              </div>
            )}

            {subdomainId && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 500, color: '#374151' }}>Field of Interest</label>
                <select
                  style={inputStyle}
                  value={interestId}
                  onChange={e => setInterestId(e.target.value)}
                >
                  <option value="">Select field of interest...</option>
                  {filteredInterests.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {filteredInterests.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    No fields listed yet. You can still continue.
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button style={btnSecondary} onClick={() => setStep('basic_info')}>← Back</button>
              <button style={btnPrimary} onClick={() => setStep('skills')}>Next →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Skills */}
        {step === 'skills' && (
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
              Initial Skills
            </h2>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Select skills you already have. You can add more later. Be honest — this helps us personalise your roadmap.
            </p>

            {groupedSkills.length === 0 && (
              <p style={{ color: '#9ca3af' }}>No skills in the database yet. You can skip this step.</p>
            )}

            {groupedSkills.map(cat => (
              <div key={cat.id} style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontWeight: 600, color: '#374151', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  {cat.name}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {cat.skills.map(skill => {
                    const sel = selectedSkills.find(s => s.skill_id === skill.id);
                    return (
                      <div key={skill.id}>
                        <button
                          type="button"
                          onClick={() => toggleSkill(skill.id)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: 20,
                            border: sel ? '2px solid #6366f1' : '1px solid #d1d5db',
                            background: sel ? '#eef2ff' : '#fff',
                            color: sel ? '#4338ca' : '#374151',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: sel ? 600 : 400,
                          }}
                        >
                          {sel && '✓ '}{skill.name}
                        </button>
                        {sel && (
                          <select
                            value={sel.proficiency}
                            onChange={e => setSkillProficiency(skill.id, e.target.value)}
                            style={{ marginLeft: '0.25rem', padding: '0.25rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.8rem' }}
                          >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button style={btnSecondary} onClick={() => setStep('domain_selection')}>← Back</button>
              <button
                style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}
                onClick={handleSaveOnboarding}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save & Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Assessment */}
        {step === 'assessment' && (
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
              Quick Skill Assessment
            </h2>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Answer a few quick questions to calibrate your skill confidence score. No pressure — just do your best!
            </p>

            {questions.length === 0 && (
              <p style={{ color: '#9ca3af' }}>No assessment questions available. You can skip this step.</p>
            )}

            {questions.map((q, idx) => (
              <div key={q.id} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: 10 }}>
                <p style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.75rem' }}>
                  {idx + 1}. {q.text}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {q.options.map((opt, optIdx) => (
                    <label key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={q.id}
                        value={optIdx}
                        checked={answers[q.id] === optIdx}
                        onChange={() => setAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                      />
                      <span style={{ color: '#374151' }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button style={btnSecondary} onClick={() => setStep('complete')}>Skip Assessment</button>
              <button
                style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}
                onClick={handleSubmitAssessment}
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Assessment →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Complete */}
        {step === 'complete' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>
              You're all set!
            </h2>
            {assessmentScore !== null && (
              <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
                Assessment score: <strong style={{ color: '#6366f1' }}>{assessmentScore.toFixed(1)}%</strong>
              </p>
            )}
            <p style={{ color: '#6b7280', marginBottom: '2rem', maxWidth: 400, margin: '0 auto 2rem' }}>
              Your profile is ready. You can refine your skills and upload your resume anytime from the Resume Intelligence section.
            </p>
            <button style={{ ...btnPrimary, padding: '0.75rem 2.5rem', fontSize: '1rem' }} onClick={handleFinish}>
              Go to Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
