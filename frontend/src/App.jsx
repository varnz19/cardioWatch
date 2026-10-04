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

  const onLanding = activePage === 'landing';

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
    handleAnalysisRequest({ sampleName: sampleType });
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        hasAnalysis={!!analysis && !onLanding}
        currentDatasetName={analysis?.dataset_name}
        onQuickSample={handleQuickSample}
        onNewDataset={() => { setGlobalError(''); setActivePage('landing'); }}
        loading={loading}
      />

      {globalError && !onLanding && (
        <div style={{
          background: 'var(--bg-subtle)',
          borderBottom: '1px solid #b3423a',
          padding: '8px 24px',
          fontSize: '0.78rem',
          color: '#b3423a'
        }}>
          <strong>Error:</strong> {globalError}
        </div>
      )}

      <main className="page-container">
        {/* Skeleton Loaders during data processing */}
        {loading ? (
          <div className="skeleton-container">
            <div className="skeleton-box skeleton-kpi" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div className="skeleton-box" style={{ height: 80 }} />
              <div className="skeleton-box" style={{ height: 80 }} />
              <div className="skeleton-box" style={{ height: 80 }} />
            </div>
            <div className="skeleton-box skeleton-chart" />
            <div className="skeleton-box" style={{ height: 160 }} />
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

      {/* Floating Bottom Navigation Dock (hidden on the landing page) */}
      {!onLanding && (
        <BottomNav
          activePage={activePage}
          setActivePage={setActivePage}
        />
      )}

      {/* Institutional Footer with Legal & Regulatory links */}
      <Footer onOpenLegal={setLegalModal} />

      {/* Terms of Service & Privacy Policy Modals */}
      {legalModal && (
        <div className="modal-overlay" onClick={() => setLegalModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--border-default)', paddingBottom: 8 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase' }}>
                {legalModal === 'privacy' ? 'Privacy Policy & Data Governance' : 'Terms of Service'}
              </h3>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '2px 8px' }}
                onClick={() => setLegalModal(null)}
              >
                Close
              </button>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {legalModal === 'privacy' ? (
                <>
                  <p><strong>1. Clinical Data Handling:</strong> CardioWatch processes tabular clinical biomarkers locally in-memory. Uploaded datasets are never transmitted to external third-party cloud services or telemetry trackers.</p>
                  <p style={{ marginTop: 8 }}><strong>2. Patient De-Identification:</strong> All sample records conform to HIPAA Safe Harbor guidelines; direct patient identifiers (names, SSNs, MRNs) are excluded. Only anonymized physiological parameters are stored.</p>
                  <p style={{ marginTop: 8 }}><strong>3. Local Retention:</strong> Exported CSV files reside strictly within the local filesystem directory for downstream Tableau consumption.</p>
                </>
              ) : (
                <>
                  <p><strong>1. Academic & Research Purpose:</strong> CardioWatch is designed strictly for academic coursework, machine learning monitoring research, and visual analytics laboratory evaluation.</p>
                  <p style={{ marginTop: 8 }}><strong>2. No Diagnostic Warranty:</strong> Predictions generated by this system are statistical outputs and must never be interpreted as clinical diagnoses or medical advice. Licensed clinical evaluation is mandatory for any patient care decision.</p>
                  <p style={{ marginTop: 8 }}><strong>3. Model Limitations:</strong> Drift metrics reflect statistical distribution shifts (P(X)) and do not guarantee causal clinical outcomes.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
