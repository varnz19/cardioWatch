import React from 'react';

export default function Navbar({ activePage, currentDatasetName, onQuickSample, onUploadClick, loading }) {
  const titles = {
    upload: 'Dataset Ingestion & Validation',
    dashboard: 'Executive Surveillance Command Hub',
    dataset: 'Dataset Profile & Distributions',
    performance: 'Model Performance & Diagnostic Error Decay',
    drift: 'Covariate Shift & Kolmogorov-Smirnov Drift',
    fairness: 'Demographic Subgroup Fairness & Disparity',
    prediction: 'Individual Patient Risk Scoring',
    simulation: 'Longitudinal Multi-Period Simulated Monitoring',
    export: 'Tableau Data Exchange & Extract Generator'
  };

  return (
    <header className="top-navbar">
      <div className="page-breadcrumb">
        <h2 className="page-title">{titles[activePage] || 'Surveillance Dashboard'}</h2>
        {currentDatasetName && (
          <div className="active-dataset-tag">
            Active: {currentDatasetName}
          </div>
        )}
      </div>

      <div className="top-actions">
        <button
          className="btn-secondary"
          onClick={() => onQuickSample('stable')}
          disabled={loading}
        >
          Load Stable Sample
        </button>

        <button
          className="btn-secondary"
          onClick={() => onQuickSample('drifted')}
          disabled={loading}
        >
          Load Drifted Sample
        </button>

        <button
          className="btn-primary"
          onClick={onUploadClick}
        >
          Upload CSV
        </button>
      </div>
    </header>
  );
}
