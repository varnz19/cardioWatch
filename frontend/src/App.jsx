import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import OverviewData from './pages/OverviewData';
import Surveillance from './pages/Surveillance';
import Export from './pages/Export';
import { analyzeDataset, getCurrentAnalysis } from './services/api';
import './App.css';

export default function App() {
  const [activePage, setActivePage] = useState('surveillance');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy' | null

  useEffect(() => {
    async function initApp() {
      try {
        setLoading(true);
        let current = await getCurrentAnalysis();
        if (!current) {
          current = await analyzeDataset();
        }
        setAnalysis(current);
      } catch (err) {
        console.warn('Initial analysis load fallback:', err);
      } finally {
        setLoading(false);
      }
    }
    initApp();
  }, []);

  const handleAnalysisRequest = async ({ file = null, sampleName = null }) => {
    setLoading(true);
    setGlobalError('');
    try {
      const result = await analyzeDataset({ file, sampleName });
      setAnalysis(result);
      setActivePage('surveillance');
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
        currentDatasetName={analysis?.dataset_name || 'Loading...'}
        onQuickSample={handleQuickSample}
        onUploadClick={() => setActivePage('overview')}
        loading={loading}
      />

      {globalError && (
        <div style={{
          background: 'var(--bg-subtle)',
          borderBottom: '1px solid #da3633',
          padding: '8px 24px',
          fontSize: '0.78rem',
          color: '#f85149'
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

      {/* Floating Bottom Navigation Dock (3 Streamlined Sections) */}
      <BottomNav
        activePage={activePage}
        setActivePage={setActivePage}
      />

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
