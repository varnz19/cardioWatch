import React from 'react';

export default function Sidebar({ activePage, setActivePage, onOpenLegal }) {
  const navItems = [
    { id: 'upload', label: 'Upload & Ingest', section: 'DATA PIPELINE' },
    { id: 'dashboard', label: 'Surveillance Hub', section: 'MONITORING' },
    { id: 'dataset', label: 'Dataset Overview', section: 'MONITORING' },
    { id: 'performance', label: 'Model Performance', section: 'ANALYTICS' },
    { id: 'drift', label: 'Data Drift (KS-Test)', section: 'ANALYTICS' },
    { id: 'fairness', label: 'Demographic Fairness', section: 'ANALYTICS' },
    { id: 'prediction', label: 'Patient Risk Scoring', section: 'CLINICAL TOOLS' },
    { id: 'simulation', label: 'Simulated 5-Mo Cohorts', section: 'CLINICAL TOOLS' },
    { id: 'export', label: 'Export for Tableau', section: 'BI EXPORTS' },
  ];

  let currentSection = '';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-text">
          <h1>
            CardioWatch
            <span className="brand-badge">SYS</span>
          </h1>
          <p>Clinical ML Surveillance</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const showSection = item.section !== currentSection;
          if (showSection) currentSection = item.section;

          return (
            <React.Fragment key={item.id}>
              {showSection && <div className="nav-section-title">{item.section}</div>}
              <button
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => setActivePage(item.id)}
              >
                {item.label}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          className="btn-tableau-export"
          onClick={() => setActivePage('export')}
        >
          Export for Tableau
        </button>

        <div className="footer-links">
          <button type="button" onClick={() => onOpenLegal('privacy')}>Privacy Policy</button>
          <span>|</span>
          <button type="button" onClick={() => onOpenLegal('terms')}>Terms of Service</button>
        </div>
      </div>
    </aside>
  );
}
