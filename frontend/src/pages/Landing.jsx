import React, { useState, useRef } from 'react';

const FLOATING_MECHANICS = [
  {
    num: '01',
    kicker: 'INGESTION ENGINE',
    title: 'PATIENT BIOMARKER INGESTION',
    desc: 'Tabular physiological biomarkers (Age, BP, Cholesterol, Max HR, ST depression) ingested without third-party cloud leakage.'
  },
  {
    num: '02',
    kicker: 'INFERENCE PIPELINE',
    title: 'LIVE RANDOM FOREST INFERENCE',
    desc: 'Trained on UCI Cleveland cardiac records. Computes real-time decision probabilities row-by-row with zero static mock output.'
  },
  {
    num: '03',
    kicker: 'CLINICAL SAFETY',
    title: 'FALSE NEGATIVE RATE SURVEILLANCE',
    desc: 'Accuracy can be deceptive. A high-accuracy model that misses true cardiac patients is clinically dangerous—we penalize FNR.'
  },
  {
    num: '04',
    kicker: 'STATISTICAL DRIFT',
    title: 'TWO-SAMPLE KS-TEST DIVERGENCE',
    desc: 'Continuous Kolmogorov-Smirnov hypothesis testing detects if the incoming patient population distribution has drifted from baseline.'
  },
  {
    num: '05',
    kicker: 'EQUITY AUDITING',
    title: 'DEMOGRAPHIC FAIRNESS & PARITY',
    desc: 'Evaluates Equal Opportunity across biological sex (Male vs Female) and age cohorts (<55 vs ≥55) to expose silent diagnostic bias.'
  },
  {
    num: '06',
    kicker: 'VISUAL HANDOFF',
    title: 'NORMALIZED TABLEAU DATASETS',
    desc: 'Generates 4 pre-calculated relational CSV exports ready for drag-and-drop visual dashboarding in Tableau.'
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
      {/* 1. Infinite Ticker Marquee */}
      <div className="marquee-wrapper" aria-hidden="true">
        <div className="marquee-track">
          <span>CARDIOWATCH // REAL-TIME DRIFT & DEMOGRAPHIC FAIRNESS SURVEILLANCE // 100% LIVE INFERENCE // TWO-SAMPLE KS-TEST // EQUAL OPPORTUNITY AUDIT // TABLEAU RELATIONAL CSV EXPORT // </span>
          <span>CARDIOWATCH // REAL-TIME DRIFT & DEMOGRAPHIC FAIRNESS SURVEILLANCE // 100% LIVE INFERENCE // TWO-SAMPLE KS-TEST // EQUAL OPPORTUNITY AUDIT // TABLEAU RELATIONAL CSV EXPORT // </span>
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
            {loading ? 'CALCULATING SURVEILLANCE...' : 'LOAD SAMPLE DATASET (200 PATIENTS) →'}
          </button>

          <p className="cta-micro-caption">
            Loads reference Cleveland patient cohort with baseline feature distribution and true ground-truth targets.
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

      {/* 3. Bottom Marquee Stats Ticker */}
      <div className="marquee-wrapper secondary-marquee" aria-hidden="true">
        <div className="marquee-track reverse">
          <span>0.05 KS P-VALUE THRESHOLD // EQUAL OPPORTUNITY AUDIT // ZERO HEURISTIC SIMULATION // 88.5% BASELINE ACCURACY // 7.1% MISSED CARDIAC CASES // </span>
          <span>0.05 KS P-VALUE THRESHOLD // EQUAL OPPORTUNITY AUDIT // ZERO HEURISTIC SIMULATION // 88.5% BASELINE ACCURACY // 7.1% MISSED CARDIAC CASES // </span>
        </div>
      </div>
    </div>
  );
}
