import React from 'react';

export default function Navbar({ currentDatasetName, onQuickSample, onNewDataset, loading }) {
  return (
    <header className="top-navbar">
      <div className="navbar-brand-group">
        <div className="brand-text" onClick={onNewDataset} style={{ cursor: 'pointer' }}>
          <h1>
            CARDIOWATCH
            <span className="brand-badge">ML HEALTH</span>
          </h1>
          <p>CARDIAC RISK PREDICTION &amp; MONITORING</p>
        </div>

        {currentDatasetName && (
          <div className="active-dataset-tag">
            <span className="live-dot" />
            <span>DATASET: {currentDatasetName}</span>
          </div>
        )}
      </div>

      <div className="top-actions">
        <button
          type="button"
          className="btn-outline-kinetic"
          onClick={() => onQuickSample('pooled')}
          disabled={loading}
        >
          USE SAMPLE DATA
        </button>

        <button
          type="button"
          className="btn-accent-kinetic"
          onClick={onNewDataset}
        >
          UPLOAD DATA
        </button>
      </div>
    </header>
  );
}
