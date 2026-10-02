import React from 'react';
import {
  Activity,
  UploadCloud,
  LayoutDashboard,
  Database,
  LineChart,
  GitCommit,
  Scale,
  UserCheck,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, hasAnalysis }) {
  const navItems = [
    { id: 'upload', label: 'Upload & Ingest', icon: UploadCloud, section: 'DATA PIPELINE' },
    { id: 'dashboard', label: 'Surveillance Hub', icon: LayoutDashboard, section: 'MONITORING' },
    { id: 'dataset', label: 'Dataset Overview', icon: Database, section: 'MONITORING' },
    { id: 'performance', label: 'Model Performance', icon: LineChart, section: 'ANALYTICS' },
    { id: 'drift', label: 'Data Drift (KS-Test)', icon: GitCommit, section: 'ANALYTICS' },
    { id: 'fairness', label: 'Demographic Fairness', icon: Scale, section: 'ANALYTICS' },
    { id: 'prediction', label: 'Patient Risk Scoring', icon: UserCheck, section: 'CLINICAL TOOLS' },
    { id: 'simulation', label: 'Simulated 5-Mo Cohorts', icon: Calendar, section: 'CLINICAL TOOLS' },
    { id: 'export', label: 'Export for Tableau', icon: FileSpreadsheet, section: 'BI EXPORTS' },
  ];

  let currentSection = '';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon-box">
          <Activity size={22} />
        </div>
        <div className="brand-text">
          <h1>
            CardioWatch
            <span className="brand-badge">v1.0</span>
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
                <item.icon size={18} />
                <span>{item.label}</span>
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
          <FileSpreadsheet size={16} />
          <span>Export for Tableau</span>
        </button>
      </div>
    </aside>
  );
}
