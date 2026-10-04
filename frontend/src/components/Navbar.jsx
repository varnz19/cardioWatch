import React from 'react';

export default function Navbar({ currentDatasetName, hasAnalysis, onQuickSample, onNewDataset, loading }) {
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

        {hasAnalysis && currentDatasetName && (
          <div className="active-dataset-tag">
            Active: {currentDatasetName}
          </div>
        )}
      </div>

      {hasAnalysis && (
        <div className="top-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onQuickSample('stable')}
            disabled={loading}
          >
            Stable Sample
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => onQuickSample('drifted')}
            disabled={loading}
          >
            Drifted Sample
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={onNewDataset}
          >
            New Dataset
          </button>
        </div>
      )}
    </header>
  );
}
