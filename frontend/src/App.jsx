import React, { useState } from 'react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import OverviewData from './pages/OverviewData';
import Surveillance from './pages/Surveillance';
import Export from './pages/Export';
import { analyzeDataset } from './services/api';
import './App.css';

export default function App() {
  const [activePage, setActivePage] = useState('landing');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy' | null

  const handleAnalysisRequest = async ({ file = null, sampleName = null, goTo = 'surveillance' }) => {
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
    handleAnalysisRequest({ sampleName: sampleType, goTo: activePage === 'landing' ? 'overview' : activePage });
  };

  const handleNavSwitch = (targetPage) => {
    if ((targetPage === 'overview' || targetPage === 'surveillance') && !analysis && !loading) {
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
                onAnalyze={(file) => handleAnalysisRequest({ file, goTo: 'overview' })}
                onUseSample={() => handleAnalysisRequest({ sampleName: 'stable', goTo: 'overview' })}
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
                onNavigateToExport={() => setActivePage('export')}
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

      {/* Institutional Footer with Legal & Regulatory links */}
      <Footer onOpenLegal={setLegalModal} />

      {/* Terms of Service & Privacy Policy Modals */}
      {legalModal && (
        <div className="modal-overlay" onClick={() => setLegalModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '2px solid var(--border-default)', paddingBottom: 10 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {legalModal === 'privacy' ? 'DATA GOVERNANCE & PRIVACY' : 'TERMS OF SURVEILLANCE SERVICE'}
              </h3>
              <button
                type="button"
                className="btn-outline-kinetic"
                style={{ padding: '4px 10px' }}
                onClick={() => setLegalModal(null)}
              >
                CLOSE [X]
              </button>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {legalModal === 'privacy' ? (
                <>
                  <p><strong>01 / LOCAL IN-MEMORY PROCESSING:</strong> CardioWatch evaluates patient biomarkers strictly inside the local runtime environment. Tabular records are never transmitted to third-party telemetric endpoints.</p>
                  <p style={{ marginTop: 12 }}><strong>02 / DE-IDENTIFIED RECORDS:</strong> All processed datasets conform to de-identification standards; direct identifiers (names, MRNs, SSNs) are strictly excluded.</p>
                  <p style={{ marginTop: 12 }}><strong>03 / ARTIFACT RETENTION:</strong> Generated CSV exports reside exclusively in the local directory for downstream Tableau consumption.</p>
                </>
              ) : (
                <>
                  <p><strong>01 / CLINICAL ML SURVEILLANCE RESEARCH:</strong> CardioWatch is designed for machine learning drift monitoring and demographic fairness evaluation.</p>
                  <p style={{ marginTop: 12 }}><strong>02 / NON-DIAGNOSTIC ADVISORY:</strong> Outputs represent statistical estimations and do not constitute certified clinical diagnosis. Licensed medical evaluation is mandatory for any patient care decision.</p>
                  <p style={{ marginTop: 12 }}><strong>03 / DISTRIBUTIONAL HYPOTHESIS:</strong> Drift metrics reflect continuous P(X) distribution divergence and equal opportunity parity.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
