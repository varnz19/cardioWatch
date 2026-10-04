import React from 'react';

export default function Navbar({ currentDatasetName, onQuickSample, onNewDataset, loading }) {
  return (
    <header className="top-navbar">
      <div className="navbar-brand-group">
        <div className="brand-text" onClick={onNewDataset} style={{ cursor: 'pointer' }}>
          <h1>
            CARDIOWATCH
            <span className="brand-badge">BATCH AUDITING</span>
          </h1>
          <p>CLINICAL ML AUDITING &amp; COVARIATE DRIFT ENGINE</p>
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
          title="Baseline Cleveland cohort (n=200)"
        >
          STABLE BASELINE
        </button>

        <button
          type="button"
          className="btn-outline-kinetic"
          onClick={() => onQuickSample('pooled')}
          disabled={loading}
          title="Pooled 4-Center UCI datasets (Cleveland, Hungarian, Switzerland, VA Long Beach, n=920, 194 females)"
        >
          POOLED UCI (n=920)
        </button>

        <button
          type="button"
          className="btn-outline-kinetic"
          onClick={() => onQuickSample('drifted')}
          disabled={loading}
          title="Synthetic stress-test cohort with BP, cholesterol, and demographic age shifts"
        >
          SYNTHETIC DRIFTED
        </button>

        <button
          type="button"
          className="btn-accent-kinetic"
          onClick={onNewDataset}
        >
          UPLOAD BATCH
        </button>
      </div>
    </header>
  );
}
