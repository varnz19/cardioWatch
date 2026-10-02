import React from 'react';
import { Database, RefreshCw, UploadCloud, CheckCircle } from 'lucide-react';

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
            <Database size={13} />
            <span>Active: <strong>{currentDatasetName}</strong></span>
          </div>
        )}
      </div>

      <div className="top-actions">
        <button
          className="btn-secondary"
          onClick={() => onQuickSample('stable')}
          disabled={loading}
          title="Analyze 200 patients with stable distribution"
        >
          <CheckCircle size={14} color="#10B981" />
          <span>Load Stable Sample</span>
        </button>

        <button
          className="btn-secondary"
          onClick={() => onQuickSample('drifted')}
          disabled={loading}
          title="Analyze 200 patients with demographic & clinical drift"
        >
          <RefreshCw size={14} color="#F59E0B" />
          <span>Load Drifted Sample</span>
        </button>

        <button
          className="btn-primary"
          onClick={onUploadClick}
        >
          <UploadCloud size={14} />
          <span>Upload CSV</span>
        </button>
      </div>
    </header>
  );
}
