import React, { useState, useRef } from 'react';
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
      setErrorMsg('Invalid file type. Please select a valid CSV file.');
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
          CARDIOWATCH: DATASET INGESTION &amp; AUDIT PIPELINE
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
          Machine learning surveillance system for cardiovascular risk models. Ingest patient telemetry,
          compute Kolmogorov-Smirnov distribution drift, and audit subgroup sensitivity parity across biological sex and age cohorts.
        </p>
      </div>

      {errorMsg && (
        <div style={{
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid #da3633',
          color: '#f85149',
          padding: '12px 14px',
          marginBottom: 16,
          fontSize: '0.8rem',
          lineHeight: 1.4
        }}>
          <strong>Dataset Validation Failure:</strong> {errorMsg}
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
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {selectedFile ? selectedFile.name : 'Select or Drop Clinical Heart Disease CSV'}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Accepted format: UCI Cleveland / Heart Disease schema (age, sex, chest pain, blood pressure, cholesterol, max HR)
        </p>

        {isUploading && (
          <p style={{ marginTop: 8, color: 'var(--accent-hover)', fontSize: '0.78rem' }}>
            Validating schema against clinical constraints...
          </p>
        )}
      </div>

      {/* Upload Metadata */}
      {uploadMetadata && (
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Ingestion Diagnostics</h3>
              <p>Validation complete. Schema compatible with inference pipeline.</p>
            </div>
            <span className="status-badge normal">Validated</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rows</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{uploadMetadata.total_rows}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Columns</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{uploadMetadata.total_columns}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Missing Values</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{uploadMetadata.missing_cells}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Supervision Target</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: uploadMetadata.has_target ? 'var(--state-normal-text)' : 'var(--text-muted)' }}>
                  {uploadMetadata.has_target ? 'Present' : 'Absent (Inference Mode)'}
                </p>
              </div>
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
              onClick={handleAnalyzeClick}
              disabled={loading}
            >
              {loading ? 'Processing ML Inference & Drift...' : 'Execute CardioWatch Surveillance Analysis'}
            </button>
          </div>
        </div>
      )}

      {/* Demonstration Datasets */}
      <div className="sample-selector-card">
        <h4 style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          Demonstration Datasets (Single-Click Ingestion)
        </h4>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
          Evaluate model stability and demographic shift with standardized test cohorts:
        </p>

        <div className="sample-buttons-row">
          <button
            className="btn-sample"
            onClick={() => onSelectSample('stable')}
            disabled={loading}
          >
            <strong>Cohort A: Stable Intake (n=200)</strong>
            <span>Nominal drift across continuous features. Balanced baseline sensitivity.</span>
          </button>

          <button
            className="btn-sample"
            onClick={() => onSelectSample('drifted')}
            disabled={loading}
          >
            <strong>Cohort B: Drifted Intake (n=200)</strong>
            <span>Demographic aging, elevated cholesterol/BP, and female atypical angina presentation.</span>
          </button>
        </div>
      </div>

      <div className="notice-box">
        <strong>Regulatory Notice:</strong> CardioWatch is designed for data visualization laboratory coursework and clinical decision support research. Predictions are for academic demonstration and not certified for diagnostic medical use.
      </div>
    </div>
  );
}
