import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Database, Play } from 'lucide-react';
import { uploadDataset } from '../services/api';

export default function Home({ onAnalysisComplete, onSelectSample, loading }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMetadata, setUploadMetadata] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file) => {
    if (!file.name.endsWith('.csv')) {
      setErrorMsg('Please select a valid CSV file.');
      return;
    }
    setErrorMsg('');
    setSelectedFile(file);
    setIsUploading(true);

    try {
      const res = await uploadDataset(file);
      setUploadMetadata(res);
    } catch (err) {
      setErrorMsg(err.message || 'Dataset validation failed.');
      setUploadMetadata(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyzeClick = () => {
    if (selectedFile) {
      onAnalysisComplete({ file: selectedFile });
    }
  };

  return (
    <div className="upload-hero">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
          CARDIOWATCH
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--accent-cyan)', fontWeight: 600, marginTop: 6 }}>
          Clinical Machine Learning Drift & Subgroup Fairness Surveillance
        </p>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', maxWidth: 640, margin: '14px auto 0', lineHeight: 1.6 }}>
          A continuous quality assurance system for cardiovascular clinical decision models. Ingest routine diagnostic telemetry,
          monitor statistical distribution drift via Kolmogorov-Smirnov tests, and audit clinical subgroup equity across biological sex and age cohorts.
        </p>
      </div>

      {errorMsg && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          marginBottom: 20,
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <AlertTriangle size={20} color="#EF4444" style={{ flexShrink: 0 }} />
          <div>
            <strong>Dataset Validation Error:</strong> {errorMsg}
          </div>
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
        <div className="upload-icon-circle">
          <UploadCloud size={32} />
        </div>
        <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>
          {selectedFile ? selectedFile.name : 'Drag & drop heart disease CSV dataset here'}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 6 }}>
          Compatible with UCI Cleveland / Heart Disease formats (age, sex, chest pain, blood pressure, cholesterol, max HR, etc.)
        </p>

        {isUploading && (
          <p style={{ marginTop: 12, color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600 }}>
            Validating dataset schema against clinical benchmarks...
          </p>
        )}
      </div>

      {/* Upload Diagnostics Card */}
      {uploadMetadata && (
        <div className="card" style={{ textAlign: 'left', marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title-group">
              <h3>Dataset Ingestion Diagnostics</h3>
              <p>Validation passed. Ready for machine learning inference and drift testing.</p>
            </div>
            <span className="status-badge normal">
              <span className="badge-dot" /> Validated
            </span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Rows</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{uploadMetadata.total_rows}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Columns</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{uploadMetadata.total_columns}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Missing Values</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{uploadMetadata.missing_cells}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Ground Truth Target</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: uploadMetadata.has_target ? 'var(--status-normal)' : 'var(--text-muted)' }}>
                  {uploadMetadata.has_target ? 'Present (Supervised)' : 'Absent (Inference Only)'}
                </p>
              </div>
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '0.95rem', justifyContent: 'center' }}
              onClick={handleAnalyzeClick}
              disabled={loading}
            >
              <Play size={18} />
              <span>{loading ? 'Executing ML Inference & Drift Engine...' : 'Execute CardioWatch Surveillance Analysis'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Test Samples */}
      <div className="sample-selector-card">
        <h4 style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={15} color="var(--accent-cyan)" />
          <span>Quick Demonstration Datasets (1-Click Test)</span>
        </h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 4 }}>
          Don't have a CSV on hand? Load pre-configured clinical cohorts to observe model stability vs. demographic drift.
        </p>

        <div className="sample-buttons-row">
          <button
            className="btn-sample"
            onClick={() => onSelectSample('stable')}
            disabled={loading}
          >
            <strong>Cohort A: Stable Intake (n=200)</strong>
            <span>Low drift across all features. Model accuracy ~88%, balanced female sensitivity.</span>
          </button>

          <button
            className="btn-sample"
            onClick={() => onSelectSample('drifted')}
            disabled={loading}
          >
            <strong style={{ color: '#FCD34D' }}>Cohort B: Drifted Intake (n=200)</strong>
            <span>Demographic aging, elevated cholesterol/BP, and female atypical angina presentation.</span>
          </button>
        </div>
      </div>

      <div className="disclaimer-box" style={{ textAlign: 'left' }}>
        <ShieldCheck size={20} style={{ flexShrink: 0 }} />
        <span>
          <strong>Educational Demonstration:</strong> CardioWatch is designed for machine learning monitoring coursework and clinical decision support research. Not certified for patient diagnosis.
        </span>
      </div>
    </div>
  );
}
