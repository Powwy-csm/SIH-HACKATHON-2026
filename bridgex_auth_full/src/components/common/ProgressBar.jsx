import React from 'react';

export default function ProgressBar({ value, colorClass = "bg-primary-blue", className = "" }) {
    return (
        <div className={`progress-track ${className}`}>
            <div className={`progress-fill ${colorClass}`} style={{ width: `${value}%` }}></div>
        </div>
    );
}