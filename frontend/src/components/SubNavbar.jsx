import React from 'react';

export default function SubNavbar({ activePage, setActivePage }) {
  const navItems = [
    { id: 'dashboard', label: 'Surveillance Hub' },
    { id: 'upload', label: 'Upload & Ingest' },
    { id: 'dataset', label: 'Dataset Overview' },
    { id: 'performance', label: 'Model Performance' },
    { id: 'drift', label: 'Data Drift (KS-Test)' },
    { id: 'fairness', label: 'Demographic Fairness' },
    { id: 'prediction', label: 'Patient Risk Scoring' },
    { id: 'simulation', label: 'Simulated 5-Mo Cohorts' },
    { id: 'export', label: 'Export for Tableau' },
  ];

  return (
    <nav className="sub-navbar">
      <div className="sub-navbar-container">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sub-nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
