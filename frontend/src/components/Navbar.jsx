import React from 'react';

export default function Navbar({ currentDatasetName, onQuickSample, onNewDataset, loading }) {
  return (
    <header className="top-navbar">
      <div className="navbar-brand-group">
        <div className="brand-text" onClick={onNewDataset} style={{ cursor: 'pointer' }}>
          <h1>
            CARDIOWATCH
            <span className="brand-badge">ML SURVEILLANCE</span>
          </h1>
          <p>CARDIAC ML SURVEILLANCE &amp; DRIFT ENGINE</p>
        </div>

        {currentDatasetName && (
          <div className="active-dataset-tag">
            <span className="live-dot" />
            <span>COHORT: {currentDatasetName}</span>
          </div>
        )}
      </div>

      <div className="top-actions">
        <button
          type="button"
          className="btn-outline-kinetic"
          onClick={() => onQuickSample('stable')}
          disabled={loading}
        >
          STABLE BASELINE
        </button>

        <button
          type="button"
          className="btn-outline-kinetic"
          onClick={() => onQuickSample('drifted')}
          disabled={loading}
        >
          DRIFTED COHORT
        </button>

        <button
          type="button"
          className="btn-accent-kinetic"
          onClick={onNewDataset}
        >
          UPLOAD DATASET
        </button>
      </div>
    </header>
  );
}
