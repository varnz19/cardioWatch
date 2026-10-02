import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Dataset from './pages/Dataset';
import Performance from './pages/Performance';
import Drift from './pages/Drift';
import Fairness from './pages/Fairness';
import Prediction from './pages/Prediction';
import Simulation from './pages/Simulation';
import Export from './pages/Export';
import { analyzeDataset, getCurrentAnalysis } from './services/api';
import './App.css';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // Initial load: check for current analysis or trigger baseline analysis
  useEffect(() => {
    async function initApp() {
      try {
        setLoading(true);
        // Attempt to load existing analysis or default reference analysis
        let current = await getCurrentAnalysis();
        if (!current) {
          current = await analyzeDataset(); // Analyzes reference dataset
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
      setActivePage('dashboard'); // Automatically take user to dashboard after successful analysis
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
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        hasAnalysis={!!analysis}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Navbar
          activePage={activePage}
          currentDatasetName={analysis?.dataset_name || 'Loading...'}
          onQuickSample={handleQuickSample}
          onUploadClick={() => setActivePage('upload')}
          loading={loading}
        />

        {loading && (
          <div style={{
            background: 'rgba(14, 165, 233, 0.15)',
            borderBottom: '1px solid rgba(14, 165, 233, 0.3)',
            padding: '10px 32px',
            fontSize: '0.85rem',
            color: 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--accent-cyan)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            <span>Executing clinical model inference, Kolmogorov-Smirnov drift tests, and demographic fairness audits...</span>
          </div>
        )}

        {globalError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '10px 32px',
            fontSize: '0.85rem',
            color: '#fca5a5'
          }}>
            <strong>Error:</strong> {globalError}
          </div>
        )}

        <main className="page-container">
          {activePage === 'upload' && (
            <Home
              onAnalysisComplete={handleAnalysisRequest}
              onSelectSample={handleQuickSample}
              loading={loading}
            />
          )}

          {activePage === 'dashboard' && (
            <Dashboard
              analysis={analysis}
              onNavigate={setActivePage}
            />
          )}

          {activePage === 'dataset' && (
            <Dataset
              analysis={analysis}
            />
          )}

          {activePage === 'performance' && (
            <Performance
              analysis={analysis}
            />
          )}

          {activePage === 'drift' && (
            <Drift
              analysis={analysis}
            />
          )}

          {activePage === 'fairness' && (
            <Fairness
              analysis={analysis}
            />
          )}

          {activePage === 'prediction' && (
            <Prediction />
          )}

          {activePage === 'simulation' && (
            <Simulation />
          )}

          {activePage === 'export' && (
            <Export />
          )}
        </main>
      </div>
    </div>
  );
}
