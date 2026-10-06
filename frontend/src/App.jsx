import React, { useState } from 'react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Landing from './pages/Landing';
import OverviewData from './pages/OverviewData';
import Surveillance from './pages/Surveillance';
import Export from './pages/Export';
import PowerBIInsights from './pages/PowerBIInsights';
import { analyzeDataset } from './services/api';
import './App.css';

export default function App() {
  const [activePage, setActivePage] = useState('landing');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const handleAnalysisRequest = async ({ file = null, sampleName = null, goTo = 'insights' }) => {
    setLoading(true);
    setGlobalError('');
    try {
      const result = await analyzeDataset({ file, sampleName });
      setAnalysis(result);
      setActivePage(goTo);
    } catch (err) {
      setGlobalError(err.message || 'Analysis processing failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSample = (sampleType) => {
    handleAnalysisRequest({ sampleName: sampleType, goTo: activePage === 'landing' ? 'insights' : activePage });
  };

  const handleNavSwitch = (targetPage) => {
    if ((targetPage === 'insights' || targetPage === 'overview' || targetPage === 'surveillance') && !analysis && !loading) {
      handleAnalysisRequest({ sampleName: 'stable', goTo: targetPage });
    } else {
      setActivePage(targetPage);
    }
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        currentDatasetName={analysis?.dataset_name}
        onQuickSample={handleQuickSample}
        onNewDataset={() => { setGlobalError(''); setActivePage('landing'); }}
        loading={loading}
      />

      {globalError && (
        <div className="global-error-strip">
          <strong>ALERT:</strong> {globalError}
        </div>
      )}

      <main className="page-container">
        {/* Skeleton Loaders during data processing */}
        {loading ? (
          <div className="skeleton-container">
            <div className="skeleton-box skeleton-kpi" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div className="skeleton-box" style={{ height: 90 }} />
              <div className="skeleton-box" style={{ height: 90 }} />
              <div className="skeleton-box" style={{ height: 90 }} />
            </div>
            <div className="skeleton-box skeleton-chart" />
            <div className="skeleton-box" style={{ height: 180 }} />
          </div>
        ) : (
          <>
            {activePage === 'landing' && (
              <Landing
                loading={loading}
                error={globalError}
                onAnalyze={(file) => handleAnalysisRequest({ file, goTo: 'insights' })}
                onUseSample={(sampleType = 'stable') => handleAnalysisRequest({ sampleName: sampleType, goTo: 'insights' })}
              />
            )}

            {activePage === 'insights' && (
              <PowerBIInsights
                analysis={analysis}
                onNavigateToDataset={() => setActivePage('overview')}
              />
            )}

            {activePage === 'overview' && (
              <OverviewData
                analysis={analysis}
                onAnalysisComplete={handleAnalysisRequest}
                onSelectSample={handleQuickSample}
                loading={loading}
              />
            )}

            {activePage === 'surveillance' && (
              <Surveillance
                analysis={analysis}
                onNavigateToExport={() => setActivePage('insights')}
              />
            )}

            {activePage === 'export' && (
              <Export />
            )}
          </>
        )}
      </main>

      {/* Floating Bottom Navigation Dock (Always present down at bottom as requested) */}
      <BottomNav
        activePage={activePage}
        setActivePage={handleNavSwitch}
      />
    </div>
  );
}
