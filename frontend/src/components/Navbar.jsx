import React from 'react';

export default function Navbar({ currentDatasetName, onQuickSample, onUploadClick, loading }) {
  return (
    <header className="top-navbar">
      <div className="navbar-brand-group">
        <div className="brand-text">
          <h1>
            CardioWatch
            <span className="brand-badge">SYS</span>
          </h1>
          <p>Clinical ML Surveillance</p>
        </div>

        {currentDatasetName && (
          <div className="active-dataset-tag">
            Active: {currentDatasetName}
          </div>
        )}
      </div>

      <div className="top-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onQuickSample('stable')}
          disabled={loading}
        >
          Load Stable Sample
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => onQuickSample('drifted')}
          disabled={loading}
        >
          Load Drifted Sample
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={onUploadClick}
        >
          Upload CSV
        </button>
      </div>
    </header>
  );
}
