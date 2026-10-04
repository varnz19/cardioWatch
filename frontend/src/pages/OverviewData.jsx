import React, { useState, useRef } from 'react';
import { uploadDataset } from '../services/api';

export default function OverviewData({ analysis, onAnalysisComplete, onSelectSample, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMetadata, setUploadMetadata] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const metadata = analysis?.metadata;
  const overview = analysis?.overview;
  const preview = analysis?.preview || [];

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

  const filteredPreview = preview.filter((row) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      String(row.age || '').includes(term) ||
      String(row.sex_desc || '').toLowerCase().includes(term) ||
      String(row.cp_desc || '').toLowerCase().includes(term) ||
      String(row.prediction_label || '').toLowerCase().includes(term) ||
      String(row.error_classification || '').toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Ingest & Cohort Selection Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Patient Data Ingestion</h3>
            <p>Upload a custom heart disease CSV cohort or select a preloaded sample</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onSelectSample('stable')}
              disabled={loading}
            >
              Load Reference Baseline
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onSelectSample('drifted')}
              disabled={loading}
            >
              Load Drifted Cohort
            </button>
          </div>
        </div>

        <div className="card-body">
          <div
            className={`dropzone-area ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '28px 20px',
              textAlign: 'center',
              backgroundColor: dragActive ? 'var(--bg-subtle)' : 'var(--bg-app)',
              cursor: 'pointer'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleChange}
            />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {selectedFile ? selectedFile.name : 'Click to select or drop CSV patient file here'}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Accepted columns: age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal
              </p>
            </div>
          </div>

          {errorMsg && (
            <div style={{ color: '#f85149', fontSize: '0.78rem', marginTop: 10 }}>
              {errorMsg}
            </div>
          )}

          {uploadMetadata && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 14,
              padding: '10px 14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Validated: {uploadMetadata.row_count} rows, {uploadMetadata.column_count} features.
              </span>
              <button
                type="button"
                className="btn-primary"
                onClick={handleAnalyzeClick}
                disabled={loading}
              >
                Run ML Surveillance →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Active Cohort Specs Strip */}
      {metadata && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Active Dataset</span>
            </div>
            <div className="metric-value" style={{ fontSize: '1rem', wordBreak: 'break-all' }}>
              {analysis.dataset_name}
            </div>
            <div className="metric-subtext">Current analyzed cohort</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Patient Count</span>
            </div>
            <div className="metric-value">{metadata.total_rows}</div>
            <div className="metric-subtext">{metadata.total_columns} clinical biomarkers</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Mean Resting BP</span>
            </div>
            <div className="metric-value">{overview?.resting_bp_mean || 'N/A'} mmHg</div>
            <div className="metric-subtext">Clinical norm: 120-130</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Mean Cholesterol</span>
            </div>
            <div className="metric-value">{overview?.cholesterol_mean || 'N/A'} mg/dL</div>
            <div className="metric-subtext">Baseline standard: &lt; 200</div>
          </div>
        </div>
      )}

      {/* 3. Patient Records Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Patient Cohort Records</h3>
            <p>Showing {filteredPreview.length} records with model inference predictions</p>
          </div>
          <input
            type="text"
            placeholder="Search patient, diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              padding: '6px 12px',
              fontSize: '0.78rem',
              borderRadius: 'var(--radius-sm)',
              width: 220
            }}
          />
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Chest Pain</th>
                  <th>Rest BP</th>
                  <th>Chol</th>
                  <th>Max HR</th>
                  <th>ST Depr</th>
                  <th>True Label</th>
                  <th>Predicted</th>
                  <th>Probability</th>
                  <th>Audit Flag</th>
                </tr>
              </thead>
              <tbody>
                {filteredPreview.slice(0, 50).map((row, idx) => {
                  const isFN = row.error_classification === 'False Negative';
                  const isFP = row.error_classification === 'False Positive';
                  return (
                    <tr key={idx} style={{ backgroundColor: isFN ? 'rgba(218, 54, 51, 0.1)' : undefined }}>
                      <td>{row.age}</td>
                      <td>{row.sex_desc || (row.sex === 1 ? 'Male' : 'Female')}</td>
                      <td>{row.cp_desc || row.cp}</td>
                      <td>{row.trestbps}</td>
                      <td>{row.chol}</td>
                      <td>{row.thalach}</td>
                      <td>{row.oldpeak}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: row.target === 1 ? '#f85149' : '#3fb950' }}>
                          {row.target === 1 ? 'Presence (1)' : 'Absence (0)'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: row.predicted_target === 1 ? '#f85149' : '#3fb950' }}>
                          {row.prediction_label || (row.predicted_target === 1 ? 'High Risk' : 'Low Risk')}
                        </span>
                      </td>
                      <td>
                        {row.predicted_probability !== undefined
                          ? `${(row.predicted_probability * 100).toFixed(1)}%`
                          : 'N/A'}
                      </td>
                      <td>
                        {isFN ? (
                          <span style={{ color: '#f85149', fontWeight: 700, fontSize: '0.72rem' }}>FALSE NEGATIVE</span>
                        ) : isFP ? (
                          <span style={{ color: '#d29922', fontWeight: 600, fontSize: '0.72rem' }}>FALSE POSITIVE</span>
                        ) : (
                          <span style={{ color: '#3fb950', fontSize: '0.72rem' }}>CORRECT</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredPreview.length > 50 && (
            <div style={{ padding: '8px 16px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Showing first 50 rows. Download full dataset in Tableau Export.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
