import React, { useState, useRef } from 'react';

const CARDIAC_STEPS = [
  {
    num: '01',
    category: 'VITAL SIGNS',
    title: 'CARDIAC BIOMARKER INGESTION',
    desc: 'Tracks key cardiovascular risk markers: Resting Blood Pressure, Serum Cholesterol, Maximum Heart Rate achieved, and Exercise ST Depression without external cloud exposure.',
    badge: 'HEART VITALS'
  },
  {
    num: '02',
    category: 'DIAGNOSTIC INFERENCE',
    title: 'EARLY CARDIAC RISK DETECTION',
    desc: 'A trained Scikit-Learn Random Forest analyzes physiological patterns live, calculating cardiac risk probabilities for each patient to flag early disease markers.',
    badge: 'LIVE ML PREDICTION'
  },
  {
    num: '03',
    category: 'SAFETY AUDITING',
    title: 'FLAGGING MISSED DIAGNOSES (FNR)',
    desc: 'A model can boast 90% accuracy while still missing critical heart disease. CardioWatch audits and flags False Negatives so high-risk cohorts are highlighted for clinical review.',
    badge: 'FNR AUDITING'
  },
  {
    num: '04',
    category: 'POPULATION DRIFT',
    title: 'COVARIATE DRIFT & PSI AUDITING',
    desc: 'If patient cohorts shift toward older age or elevated blood pressure, Two-Sample KS tests with Benjamini-Hochberg FDR control and PSI detect feature divergence.',
    badge: 'KS & PSI DRIFT'
  },
  {
    num: '05',
    category: 'EQUITY AUDITING',
    title: 'DEMOGRAPHIC FAIRNESS & 95% CIs',
    desc: 'Heart disease often manifests with atypical symptoms in women. We audit Equal Opportunity and compute 1,000-resample bootstrap 95% confidence intervals across biological sex and age cohorts.',
    badge: 'BOOTSTRAP CI'
  },
  {
    num: '06',
    category: 'CLINICAL VISUALS',
    title: 'ACTIONABLE TABLEAU EXPORTS',
    desc: 'Packages all evaluated patient risk scores, drift statistics, and subgroup equity metrics into 4 ready-to-use CSV files for physician and executive dashboards in Tableau.',
    badge: 'TABLEAU READY'
  }
];

export default function Landing({ onAnalyze, onUseSample, loading, error }) {
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState('');
  const fileInputRef = useRef(null);
  const scrollerRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setLocalError('INVALID FILE FORMAT. PLEASE SELECT A VALID .CSV PATIENT FILE.');
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

  const scrollHoriz = (direction) => {
    if (scrollerRef.current) {
      const amount = direction === 'left' ? -340 : 340;
      scrollerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const displayError = localError || error;

  return (
    <div className="kinetic-landing">
      {/* 1. Main Hero Section — Clean, Spacious, Heart-Health Focused */}
      <section className="clean-cardiac-hero">
        <div className="hero-kicker-badge">
          <span className="heart-icon">♥</span>
          <span>CLINICAL ML BATCH AUDITING &amp; COVARIATE DRIFT SURVEILLANCE</span>
        </div>

        <h1 className="clean-hero-title">
          AUDITING CARDIAC ML PREDICTIONS WITH <span className="accent-highlight">STATISTICAL RIGOR</span>
        </h1>

        <p className="clean-hero-lead">
          CardioWatch audits clinical risk models on incoming patient cohorts—quantifying covariate drift via Kolmogorov-Smirnov tests with FDR control and PSI, and computing defensible 95% bootstrap confidence intervals on subgroup false negative rates.
        </p>

        {/* Central Action Console */}
        <div className="hero-action-console">
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
              <strong className="drop-title">UPLOAD PATIENT CARDIAC BATCH (.CSV)</strong>
              <span className="drop-subtitle">OR DRAG & DROP COHORT FILE HERE</span>
              <code className="drop-columns-tag">
                VITALS: age, sex, chest_pain, resting_bp, cholesterol, fasting_sugar, max_hr, st_depression
              </code>
            </div>
          </div>

          {displayError && (
            <div className="kinetic-error-banner">
              <strong>ALERT:</strong> {displayError}
            </div>
          )}

          <div className="kinetic-divider-row">
            <span className="divider-line" />
            <span className="divider-label">OR AUDIT WITH PRE-LOADED CLINICAL COHORTS</span>
            <span className="divider-line" />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              type="button"
              className="kinetic-cta-button"
              id="use-pooled-dataset-btn"
              onClick={() => onUseSample('pooled')}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'AUDITING...' : 'POOLED MULTI-CENTER UCI (n=920) →'}
            </button>

            <button
              type="button"
              className="kinetic-cta-button"
              id="use-sample-dataset-btn"
              onClick={() => onUseSample('stable')}
              disabled={loading}
              style={{ flex: 1, backgroundColor: '#FFFFFF', color: 'var(--text-primary)' }}
            >
              {loading ? 'AUDITING...' : 'CLEVELAND BENCHMARK (n=200) →'}
            </button>
          </div>

          <p className="cta-micro-caption">
            Evaluates multi-center cohorts (Cleveland, Hungarian, Switzerland, VA Long Beach) with live bootstrap CIs, KS drift, and SQLite history recording.
          </p>
        </div>
      </section>

      {/* 3. Scrollable Content Thingy: How CardioWatch Protects Patient Health */}
      <section className="scrollable-workflow-section">
        <div className="workflow-header-row">
          <div>
            <span className="workflow-kicker">STEP-BY-STEP CLINICAL WORKFLOW</span>
            <h2 className="workflow-title">HOW CARDIAC SURVEILLANCE PROTECTS PATIENT HEALTH</h2>
            <p className="workflow-subtitle">Scroll through the 6 stages of machine-learning patient care & drift monitoring</p>
          </div>
          <div className="scroll-arrow-controls">
            <button
              type="button"
              className="scroll-btn"
              onClick={() => scrollHoriz('left')}
              title="Scroll Left"
            >
              ←
            </button>
            <button
              type="button"
              className="scroll-btn"
              onClick={() => scrollHoriz('right')}
              title="Scroll Right"
            >
              →
            </button>
          </div>
        </div>

        {/* Scrollable Cards Container */}
        <div className="workflow-cards-track" ref={scrollerRef}>
          {CARDIAC_STEPS.map((step) => (
            <div key={step.num} className="workflow-card">
              <div className="workflow-card-top">
                <span className="workflow-num">{step.num}</span>
                <span className="workflow-badge">{step.badge}</span>
              </div>
              <span className="workflow-category">{step.category}</span>
              <h3 className="workflow-card-title">{step.title}</h3>
              <p className="workflow-card-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
