import React from 'react';

export default function SkillTag({ name, isVerified = false }) {
    return (
        <span className={`s-tag ${isVerified ? 'verified' : ''}`}>
            {name}
            {isVerified && <i className="ph-fill ph-check-circle"></i>}
        </span>
    );
}