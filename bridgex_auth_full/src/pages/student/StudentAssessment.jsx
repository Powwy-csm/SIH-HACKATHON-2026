import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const questions = [
  {
    category: 'Backend Development',
    text: 'How comfortable are you building and deploying a REST API?',
    options: [
      ['beginner', "I understand the concept but have not built one from scratch."],
      ['intermediate', 'I can build basic endpoints and connect to a database.'],
      ['advanced', 'I handle authentication, middleware, and proper error handling.'],
    ],
  },
  {
    category: 'Cloud Deployment',
    text: 'How often have you deployed an app to a cloud platform?',
    options: [
      ['beginner', 'I have followed tutorials but need guidance.'],
      ['intermediate', 'I have deployed personal or class projects.'],
      ['advanced', 'I can configure environments, logs, and release workflows.'],
    ],
  },
  {
    category: 'Machine Learning',
    text: 'How confident are you evaluating an ML model?',
    options: [
      ['beginner', 'I know basic accuracy metrics.'],
      ['intermediate', 'I compare models using multiple metrics.'],
      ['advanced', 'I tune, validate, and explain model tradeoffs.'],
    ],
  },
];

export default function StudentAssessment() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState('');
  const question = questions[questionIndex];
  const progress = useMemo(() => Math.round(((questionIndex + 1) / questions.length) * 100), [questionIndex]);

  const chooseAnswer = (value) => {
    setAnswers(previous => ({ ...previous, [questionIndex]: value }));
    setMessage('');
  };

  const goNext = () => {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex(questionIndex + 1);
      return;
    }
    setMessage('Assessment saved. Your skill profile has been updated.');
  };

  return (
    <main className="view-section active">
      <div className="assessment-container">
        <div className="assessment-header">
          <h2>Let's understand your skills</h2>
          <Link className="btn btn-text" to="/student/dashboard">Save & Exit</Link>
        </div>

        <div className="assessment-progress">
          <div className="step-text">Question {questionIndex + 1} of {questions.length} - {question.category}</div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>
        </div>

        <div className="question-card">
          <h3 className="question-text">{question.text}</h3>
          <div className="options-list">
            {question.options.map(([value, description]) => (
              <label className="option-item" key={value}>
                <input
                  type="radio"
                  name={`q-${questionIndex}`}
                  value={value}
                  checked={answers[questionIndex] === value}
                  onChange={() => chooseAnswer(value)}
                />
                <div className="option-content">
                  <span className="o-title">{value[0].toUpperCase() + value.slice(1)}</span>
                  <span className="o-desc">{description}</span>
                </div>
                <div className="radio-indicator"></div>
              </label>
            ))}
          </div>
        </div>

        {message && <div className="inline-notice status-success">{message}</div>}

        <div className="assessment-footer">
          <button className="btn btn-outline" type="button" disabled={questionIndex === 0} onClick={() => setQuestionIndex(questionIndex - 1)}>Previous</button>
          <button className="btn btn-primary px-32" type="button" onClick={goNext}>
            {questionIndex === questions.length - 1 ? 'Finish Assessment' : 'Next Question'}
          </button>
        </div>
      </div>
    </main>
  );
}
