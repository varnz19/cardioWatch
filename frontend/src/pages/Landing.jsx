import React, { useState, useRef } from 'react';

const FLOATING_MECHANICS = [
  {
    num: '01',
    kicker: 'INGESTION ENGINE',
    title: 'PATIENT BIOMARKER INGESTION',
    desc: 'Ingest raw tabular clinical biomarkers (Age, BP, Cholesterol, Max HR, ST depression) directly into the local evaluation runtime.'
  },
  {
    num: '02',
    kicker: 'INFERENCE PIPELINE',
    title: 'LIVE RANDOM FOREST INFERENCE',
    desc: 'The backend Scikit-Learn model runs real-time inference on every incoming row, generating predicted probabilities and diagnostic labels.'
  },
  {
    num: '03',
    kicker: 'CLINICAL SAFETY',
    title: 'FALSE NEGATIVE SURVEILLANCE',
    desc: 'Raw accuracy can be deceptive. A model missing actual cardiac patients is clinically hazardous—we audit the False Negative Rate directly.'
  },
  {
    num: '04',
    kicker: 'STATISTICAL DRIFT',
    title: 'TWO-SAMPLE KS-TEST DIVERGENCE',
    desc: 'Dynamic Kolmogorov-Smirnov continuous tests and categorical PSI evaluate whether incoming patient distributions diverge from the training baseline.'
  },
  {
    num: '05',
    kicker: 'EQUITY AUDITING',
    title: 'DEMOGRAPHIC FAIRNESS & PARITY',
    desc: 'Audits diagnostic performance across biological sex (Male vs. Female) and age cohorts (<55 vs. ≥55) to expose subgroup sensitivity disparities.'
  },
  {
    num: '06',
    kicker: 'VISUAL HANDOFF',
    title: 'NORMALIZED TABLEAU DATASETS',
    desc: 'Exports 4 relational CSV tables with patient risk scores, drift statistics, and subgroup disparities ready for Tableau visual analysis.'
  }
];

export default function Landing({ onAnalyze, onUseSample, loading, error }) {
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setLocalError('INVALID FILE FORMAT. PLEASE SELECT A VALID .CSV FILE.');
      return;
    }
    setLocalError('');
    onAnalyze(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFile(e.dataTransfer.files && e.dataTransfer.files[0]);
  };

  const displayError = localError || error;

  return (
    <div className="kinetic-landing">
      {/* 1. Top Infinite Ticker Marquee */}
      <div className="marquee-wrapper" aria-hidden="true">
        <div className="marquee-track">
          <span>CARDIOWATCH // REAL-TIME DRIFT & DEMOGRAPHIC FAIRNESS SURVEILLANCE // DYNAMIC TWO-SAMPLE KS-TEST // POPULATION STABILITY INDEX // LIVE SCIKIT-LEARN INFERENCE // TABLEAU RELATIONAL CSV EXPORT // </span>
          <span>CARDIOWATCH // REAL-TIME DRIFT & DEMOGRAPHIC FAIRNESS SURVEILLANCE // DYNAMIC TWO-SAMPLE KS-TEST // POPULATION STABILITY INDEX // LIVE SCIKIT-LEARN INFERENCE // TABLEAU RELATIONAL CSV EXPORT // </span>
        </div>
      </div>

      {/* 2. Main Hero Section */}
      <div className="kinetic-hero-grid">
        {/* Left Column: Floating Explanatory Cards */}
        <div className="floating-column left-column">
          {FLOATING_MECHANICS.slice(0, 3).map((item, idx) => (
            <div
              key={item.num}
              className="kinetic-card floating-step-card"
              style={{ animationDelay: `${idx * 0.7}s` }}
            >
              <div className="step-badge-row">
                <span className="step-counter">{item.num}</span>
                <span className="step-kicker">{item.kicker}</span>
              </div>
              <h3 className="card-headline">{item.title}</h3>
              <p className="card-body-text">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Center Column: Massive Headline & Ingestion Control */}
        <div className="center-action-column">
          <div className="hero-kicker-tag">
            <span>CLINICAL MACHINE LEARNING SURVEILLANCE</span>
          </div>

          <h1 className="hero-kinetic-title">
            IS YOUR CARDIAC MODEL STILL <span className="accent-highlight">TELLING THE TRUTH?</span>
          </h1>

          <p className="hero-kinetic-lead">
            When patient populations shift, machine learning models degrade silently. CardioWatch continuously audits diagnostic accuracy, statistical data drift, and demographic equity.
          </p>

          {/* Ingestion Dropzone */}
          <div
            className={`kinetic-dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            id="kinetic-upload-box"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files && e.target.files[0])}
            />

            <div className="dropzone-inner">
              <span className="drop-icon-mark">▲</span>
              <strong className="drop-title">DROP PATIENT CSV TO COMMENCE INGESTION</strong>
              <span className="drop-subtitle">OR CLICK TO BROWSE LOCAL DIRECTORY</span>
              <code className="drop-columns-tag">
                FEATURES: age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal
              </code>
            </div>
          </div>

          {displayError && (
            <div className="kinetic-error-banner">
              <strong>ERROR:</strong> {displayError}
            </div>
          )}

          <div className="kinetic-divider-row">
            <span className="divider-line" />
            <span className="divider-label">OR EXECUTE PRELOADED BENCHMARK</span>
            <span className="divider-line" />
          </div>

          {/* Use Sample Dataset CTA Button */}
          <button
            type="button"
            className="kinetic-cta-button"
            id="use-sample-dataset-btn"
            onClick={onUseSample}
            disabled={loading}
          >
            {loading ? 'CALCULATING LIVE METRICS...' : 'LOAD SAMPLE BENCHMARK (UCI CLEVELAND) →'}
          </button>

          <p className="cta-micro-caption">
            Loads reference Cleveland patient cohort to compute live Kolmogorov-Smirnov drift and demographic fairness.
          </p>
        </div>

        {/* Right Column: Floating Explanatory Cards */}
        <div className="floating-column right-column">
          {FLOATING_MECHANICS.slice(3, 6).map((item, idx) => (
            <div
              key={item.num}
              className="kinetic-card floating-step-card"
              style={{ animationDelay: `${(idx + 3) * 0.7}s` }}
            >
              <div className="step-badge-row">
                <span className="step-counter">{item.num}</span>
                <span className="step-kicker">{item.kicker}</span>
              </div>
              <h3 className="card-headline">{item.title}</h3>
              <p className="card-body-text">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Bottom Marquee Pipeline Ticker (100% descriptive, zero fake numbers) */}
      <div className="marquee-wrapper secondary-marquee" aria-hidden="true">
        <div className="marquee-track reverse">
          <span>DYNAMIC P-VALUE EVALUATION // EQUAL OPPORTUNITY AUDIT // ZERO HEURISTIC SIMULATION // CONFUSION MATRIX ANALYSIS // DYNAMIC SUBGROUP SLICING // </span>
          <span>DYNAMIC P-VALUE EVALUATION // EQUAL OPPORTUNITY AUDIT // ZERO HEURISTIC SIMULATION // CONFUSION MATRIX ANALYSIS // DYNAMIC SUBGROUP SLICING // </span>
        </div>
      </div>
    </div>
  );
}
