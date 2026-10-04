import React, { useState, useRef, useMemo } from 'react';
import { uploadDataset } from '../services/api';

export default function OverviewData({ analysis, onAnalysisComplete, onSelectSample, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
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
      setErrorMsg('Invalid file format. Please select a valid .csv patient cohort file.');
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

  // Cohort Risk Statistics
  const riskCounts = useMemo(() => {
    let high = 0;
    let moderate = 0;
    let low = 0;
    let fnCount = 0;

    preview.forEach((row) => {
      const prob = row.predicted_probability ?? 0;
      if (row.risk_level === 'HIGH CARDIAC RISK' || prob >= 0.70) {
        high += 1;
      } else if (row.risk_level === 'MODERATE / ELEVATED' || prob >= 0.40) {
        moderate += 1;
      } else {
        low += 1;
      }

      if (row.error_classification === 'False Negative') {
        fnCount += 1;
      }
    });

    return { total: preview.length, high, moderate, low, fnCount };
  }, [preview]);

  // Filtered preview by search and risk filter
  const filteredPreview = useMemo(() => {
    return preview.filter((row) => {
      const prob = row.predicted_probability ?? 0;
      const isHigh = row.risk_level === 'HIGH CARDIAC RISK' || prob >= 0.70;
      const isMod = row.risk_level === 'MODERATE / ELEVATED' || (prob >= 0.40 && prob < 0.70);
      const isLow = row.risk_level === 'LOW RISK (STABLE)' || prob < 0.40;
      const isFN = row.error_classification === 'False Negative';

      if (riskFilter === 'HIGH' && !isHigh) return false;
      if (riskFilter === 'MODERATE' && !isMod) return false;
      if (riskFilter === 'LOW' && !isLow) return false;
      if (riskFilter === 'FN' && !isFN) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        String(row.patient_name || '').toLowerCase().includes(term) ||
        String(row.patient_id || '').toLowerCase().includes(term) ||
        String(row.risk_level || '').toLowerCase().includes(term) ||
        String(row.age || '').includes(term) ||
        String(row.sex_desc || '').toLowerCase().includes(term) ||
        String(row.cp_desc || '').toLowerCase().includes(term) ||
        String(row.prediction_label || '').toLowerCase().includes(term) ||
        String(row.error_classification || '').toLowerCase().includes(term)
      );
    });
  }, [preview, riskFilter, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Clinical Cohort Summary KPI Cards */}
      {metadata && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Analyzed Cohort</span>
              <span className="brand-badge">PATIENTS</span>
            </div>
            <div className="metric-value">{metadata.total_rows}</div>
            <div className="metric-subtext">Active file: {analysis.dataset_name}</div>
          </div>

          <div className="metric-card" style={{ borderLeft: '4px solid #EF4444' }}>
            <div className="metric-header">
              <span className="metric-label" style={{ color: '#991B1B' }}>High Cardiac Risk</span>
              <span className="status-badge attention">URGENT</span>
            </div>
            <div className="metric-value" style={{ color: '#B91C1C' }}>
              {riskCounts.high} <span style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>({((riskCounts.high / (riskCounts.total || 1)) * 100).toFixed(0)}%)</span>
            </div>
            <div className="metric-subtext">Probability &ge; 70% // Immediate triage</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Vitals Benchmark</span>
            </div>
            <div className="metric-value" style={{ fontSize: '1.45rem' }}>
              {overview?.resting_bp_mean || '—'} <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>mmHg</span> / {overview?.cholesterol_mean || '—'} <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>mg/dL</span>
            </div>
            <div className="metric-subtext">Mean Resting BP & Cholesterol</div>
          </div>

          <div className="metric-card" style={{ borderLeft: riskCounts.fnCount > 0 ? '4px solid #DC2626' : '4px solid #10B981' }}>
            <div className="metric-header">
              <span className="metric-label">Diagnostic Safety</span>
              <span className={`status-badge ${riskCounts.fnCount > 0 ? 'attention' : 'normal'}`}>
                {riskCounts.fnCount > 0 ? 'AUDIT ALERT' : 'SECURE'}
              </span>
            </div>
            <div className="metric-value" style={{ color: riskCounts.fnCount > 0 ? '#B91C1C' : '#047857' }}>
              {riskCounts.fnCount}
            </div>
            <div className="metric-subtext">
              {riskCounts.fnCount > 0 ? 'Missed Sick Patients (False Negatives)' : '0 Missed Diagnoses in Cohort'}
            </div>
          </div>
        </div>
      )}

      {/* 2. Patient Cohort Records & Risk Classification Table */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="card-title-group">
            <h3>PATIENT CARDIAC RISK REGISTRY</h3>
            <p>Individualized physiological profile, predictive risk score, and clinical surveillance flag</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              placeholder="Search by patient name, ID, risk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="patient-search-input"
              style={{
                backgroundColor: '#FFFFFF',
                border: '2px solid var(--border)',
                color: 'var(--foreground)',
                padding: '8px 14px',
                fontSize: '0.8rem',
                width: 260,
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {/* Quick Risk Category Filter Strip */}
        <div className="risk-filter-bar">
          <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)', marginRight: 4 }}>
            FILTER RISK:
          </span>
          <button
            type="button"
            className={`risk-filter-btn ${riskFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setRiskFilter('ALL')}
          >
            ALL PATIENTS ({riskCounts.total})
          </button>
          <button
            type="button"
            className={`risk-filter-btn ${riskFilter === 'HIGH' ? 'active' : ''}`}
            onClick={() => setRiskFilter('HIGH')}
            style={{ color: riskFilter === 'HIGH' ? '#000000' : '#991B1B' }}
          >
            🚨 HIGH CARDIAC RISK ({riskCounts.high})
          </button>
          <button
            type="button"
            className={`risk-filter-btn ${riskFilter === 'MODERATE' ? 'active' : ''}`}
            onClick={() => setRiskFilter('MODERATE')}
            style={{ color: riskFilter === 'MODERATE' ? '#000000' : '#92400E' }}
          >
            ⚠️ ELEVATED ({riskCounts.moderate})
          </button>
          <button
            type="button"
            className={`risk-filter-btn ${riskFilter === 'LOW' ? 'active' : ''}`}
            onClick={() => setRiskFilter('LOW')}
            style={{ color: riskFilter === 'LOW' ? '#000000' : '#065F46' }}
          >
            ✓ LOW RISK ({riskCounts.low})
          </button>
          {riskCounts.fnCount > 0 && (
            <button
              type="button"
              className={`risk-filter-btn ${riskFilter === 'FN' ? 'active' : ''}`}
              onClick={() => setRiskFilter('FN')}
              style={{ backgroundColor: riskFilter === 'FN' ? '#DC2626' : '#FEE2E2', color: riskFilter === 'FN' ? '#FFFFFF' : '#991B1B' }}
            >
              ⚠ MISSED SICK PATIENTS ({riskCounts.fnCount})
            </button>
          )}
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 160 }}>PATIENT IDENTITY</th>
                  <th style={{ minWidth: 170 }}>CLINICAL RISK STATUS</th>
                  <th style={{ minWidth: 150 }}>RISK PROBABILITY</th>
                  <th>AGE / SEX</th>
                  <th>REST BP</th>
                  <th>CHOLESTEROL</th>
                  <th>MAX HR</th>
                  <th>CHEST PAIN TYPE</th>
                  <th>ACTUAL DIAGNOSIS</th>
                  <th>AUDIT SAFETY FLAG</th>
                </tr>
              </thead>
              <tbody>
                {filteredPreview.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted-foreground)' }}>
                      No patients match current search or risk filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPreview.map((row, idx) => {
                    const prob = row.predicted_probability !== undefined ? row.predicted_probability : 0;
                    const pct = Math.round(prob * 100);
                    const isHigh = row.risk_level === 'HIGH CARDIAC RISK' || prob >= 0.70;
                    const isMod = row.risk_level === 'MODERATE / ELEVATED' || (prob >= 0.40 && prob < 0.70);
                    const isFN = row.error_classification === 'False Negative';
                    const isFP = row.error_classification === 'False Positive';

                    let badgeClass = 'risk-badge low-risk';
                    let badgeLabel = '✓ LOW RISK (STABLE)';
                    let barColor = '#10B981';

                    if (isHigh) {
                      badgeClass = 'risk-badge high-risk';
                      badgeLabel = '🚨 HIGH RISK (URGENT)';
                      barColor = '#EF4444';
                    } else if (isMod) {
                      badgeClass = 'risk-badge moderate-risk';
                      badgeLabel = '⚠️ ELEVATED RISK';
                      barColor = '#F59E0B';
                    }

                    return (
                      <tr
                        key={idx}
                        style={{
                          backgroundColor: isFN
                            ? '#FEF2F2'
                            : isHigh
                            ? 'rgba(239, 68, 68, 0.03)'
                            : undefined
                        }}
                      >
                        {/* Patient Identity */}
                        <td>
                          <div className="patient-name-cell">
                            <span className="patient-name-title">{row.patient_name || `Patient #${idx + 1}`}</span>
                            <span className="patient-id-sub">{row.patient_id || `PT-${1001 + idx}`}</span>
                          </div>
                        </td>

                        {/* Clinical Risk Status */}
                        <td>
                          <span className={badgeClass}>{badgeLabel}</span>
                        </td>

                        {/* Risk Probability with Visual Bar */}
                        <td>
                          <div className="prob-meter-container">
                            <div className="prob-meter-bar">
                              <div
                                className="prob-meter-fill"
                                style={{ width: `${pct}%`, backgroundColor: barColor }}
                              />
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '0.8rem', color: isHigh ? '#B91C1C' : 'var(--foreground)' }}>
                              {pct}%
                            </span>
                          </div>
                        </td>

                        {/* Age & Sex */}
                        <td>
                          {row.age}y // {row.sex_desc || (row.sex === 1 ? 'Male' : 'Female')}
                        </td>

                        {/* Resting BP */}
                        <td>
                          <span style={{ fontWeight: row.trestbps > 140 ? 700 : 400, color: row.trestbps > 140 ? '#DC2626' : 'inherit' }}>
                            {row.trestbps} <span style={{ fontSize: '0.68rem', color: 'var(--muted-foreground)' }}>mmHg</span>
                          </span>
                        </td>

                        {/* Cholesterol */}
                        <td>
                          <span style={{ fontWeight: row.chol > 240 ? 700 : 400, color: row.chol > 240 ? '#DC2626' : 'inherit' }}>
                            {row.chol} <span style={{ fontSize: '0.68rem', color: 'var(--muted-foreground)' }}>mg/dL</span>
                          </span>
                        </td>

                        {/* Max HR */}
                        <td>
                          {row.thalach} <span style={{ fontSize: '0.68rem', color: 'var(--muted-foreground)' }}>bpm</span>
                        </td>

                        {/* Chest Pain */}
                        <td>
                          <span style={{ fontSize: '0.74rem' }}>{row.cp_desc || row.cp}</span>
                        </td>

                        {/* Actual Clinical Diagnosis */}
                        <td>
                          {row.target !== undefined ? (
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                color: row.target === 1 ? '#DC2626' : '#059669',
                                textTransform: 'uppercase'
                              }}
                            >
                              {row.target === 1 ? 'Heart Disease (1)' : 'Absence (0)'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '0.72rem' }}>Blind Cohort</span>
                          )}
                        </td>

                        {/* Audit Safety Flag */}
                        <td>
                          {isFN ? (
                            <span className="status-badge attention" style={{ fontWeight: 800 }}>
                              🚨 MISSED SICK (FN)
                            </span>
                          ) : isFP ? (
                            <span className="status-badge monitor">
                              FALSE POSITIVE (FP)
                            </span>
                          ) : row.target !== undefined ? (
                            <span className="status-badge normal">
                              ✓ ACCURATE
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '0.72rem' }}>
                              PREDICTED
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
            <span>Showing {filteredPreview.length} evaluated patient records in cohort</span>
            <span>All records exportable to Tableau format in Export tab</span>
          </div>
        </div>
      </div>

      {/* 3. Ingestion & Benchmark Cohort Switcher */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>LOAD ANOTHER PATIENT COHORT</h3>
            <p>Upload institutional patient CSV file or toggle clinical benchmarks</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onSelectSample('stable')}
              disabled={loading}
              id="load-stable-btn"
            >
              Load Reference Cohort
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onSelectSample('drifted')}
              disabled={loading}
              id="load-drifted-btn"
            >
              Load Shifted / Drifted Cohort
            </button>
          </div>
        </div>

        <div className="card-body">
          <div
            className={`kinetic-dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleChange}
            />

            <div className="dropzone-inner">
              <span className="drop-icon-mark">▲</span>
              <strong className="drop-title">
                {selectedFile ? selectedFile.name : 'UPLOAD CUSTOM PATIENT CSV FILE'}
              </strong>
              <span className="drop-subtitle">
                DROP FILE HERE TO RUN FULL CARDIAC SURVEILLANCE & DRIFT AUDITS
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="kinetic-error-banner">
              <strong>ALERT:</strong> {errorMsg}
            </div>
          )}

          {uploadMetadata && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 12,
              padding: '12px 16px',
              backgroundColor: '#FAFCE8',
              border: '2px solid var(--border)'
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Validated: {uploadMetadata.total_rows} Patient Records // {uploadMetadata.total_columns} Features Mapped
              </span>
              <button
                type="button"
                className="kinetic-cta-button"
                style={{ width: 'auto', padding: '8px 18px', fontSize: '0.8rem' }}
                onClick={handleAnalyzeClick}
                disabled={loading}
              >
                {loading ? 'Evaluating...' : 'RUN CARDIAC ANALYSIS →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
