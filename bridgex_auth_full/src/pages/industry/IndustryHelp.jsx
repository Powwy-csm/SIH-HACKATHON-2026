import '../../styles/industry-help.css';
import React from 'react';

const faqs = [
    {
        question: 'How does candidate matching work?',
        answer: 'BridgeX compares the skills and experience in a candidate profile with the requirements of an opportunity and generates a match score. Verified skills, projects, certifications, and relevant experience can all contribute to the match.'
    },
    {
        question: 'How do I post an opportunity?',
        answer: 'Open Opportunities from the sidebar and use the Post Opportunity button. Add the role, description, required skills, eligibility, and deadline, then publish it.'
    },
    {
        question: 'How do I shortlist a candidate?',
        answer: 'Open Talent / Students or the relevant application list, review the candidate profile and match details, then use the Shortlist action.'
    },
    {
        question: 'What is Skill Demand?',
        answer: 'Skill Demand shows skills that are frequently requested across relevant industry opportunities. Use it to understand current demand and plan hiring or academic collaboration.'
    },
    {
        question: 'How do collaborations work?',
        answer: 'Use Collaborations to view university partnerships, joint projects, workshops, CoE activities, and other academia-industry initiatives.'
    },
    {
        question: 'Where can I manage company details?',
        answer: 'Open Company Profile from the sidebar. Your company information is kept separate from the operational dashboard.'
    }
];

export default function IndustryHelp() {
    return (
        <main className="dashboard-area">
            <div className="dashboard-header">
                <div>
                    <h2>BridgeX Help Center</h2>
                    <p className="subtitle">
                        Quick answers for opportunities, talent matching, and academia-industry collaboration.
                    </p>
                </div>
            </div>

            <section className="card">
                <div className="card-header">
                    <div>
                        <h3>Frequently Asked Questions</h3>
                        <p className="subtitle">Common questions about using the Industry Portal.</p>
                    </div>
                </div>

                <div className="help-faq-list">
                    {faqs.map((faq) => (
                        <div className="help-faq-item" key={faq.question}>
                            <div className="help-faq-icon">
                                <i className="ph ph-question"></i>
                            </div>
                            <div>
                                <h4>{faq.question}</h4>
                                <p>{faq.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="card help-support-card">
                <div className="card-header">
                    <div>
                        <h3>Campus & Enterprise Support</h3>
                        <p className="subtitle">
                            For account, platform, or collaboration support.
                        </p>
                    </div>
                    <span className="badge badge-blue">Support</span>
                </div>

                <div className="help-support-content">
                    <div>
                        <span className="help-support-label">Email</span>
                        <strong>support@bridgex.demo</strong>
                    </div>
                    <div>
                        <span className="help-support-label">Typical response</span>
                        <strong>Within 1 business day</strong>
                    </div>
                </div>
            </section>
        </main>
    );
}
