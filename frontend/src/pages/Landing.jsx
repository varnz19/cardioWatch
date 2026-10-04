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
    category: 'PATIENT SAFETY',
    title: 'PREVENTING MISSED DIAGNOSES (FNR)',
    desc: 'A model can boast 90% accuracy while still missing critical heart disease. CardioWatch penalizes False Negatives so high-risk patients are never overlooked.',
    badge: 'ZERO SICK MISSED'
  },
  {
    num: '04',
    category: 'POPULATION HEALTH',
    title: 'VITAL SIGNS & POPULATION DRIFT',
    desc: 'If hospital admissions shift toward older patients or elevated resting blood pressure, the Kolmogorov-Smirnov test detects feature divergence before diagnostic accuracy degrades.',
    badge: 'KS-TEST DRIFT'
  },
  {
    num: '05',
    category: 'EQUITABLE CARE',
    title: 'GENDER & AGE FAIRNESS AUDITS',
    desc: 'Heart disease often manifests with atypical symptoms in women. We audit Equal Opportunity across biological sex and age cohorts to ensure equitable healthcare for every patient.',
    badge: 'BIAS AUDITING'
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
      {/* 1. Top Informational Ticker Marquee */}
      <div className="marquee-wrapper" aria-hidden="true">
        <div className="marquee-track">
          <span>CARDIOWATCH // CARDIAC HEALTHCARE SURVEILLANCE // EARLY HEART DISEASE DETECTION // TWO-SAMPLE KS-TEST VITAL SHIFT MONITORING // EQUAL OPPORTUNITY GENDER FAIRNESS // TABLEAU RELATIONAL CSV EXPORT // </span>
          <span>CARDIOWATCH // CARDIAC HEALTHCARE SURVEILLANCE // EARLY HEART DISEASE DETECTION // TWO-SAMPLE KS-TEST VITAL SHIFT MONITORING // EQUAL OPPORTUNITY GENDER FAIRNESS // TABLEAU RELATIONAL CSV EXPORT // </span>
        </div>
      </div>

      {/* 2. Main Hero Section — Clean, Spacious, Heart-Health Focused */}
      <section className="clean-cardiac-hero">
        <div className="hero-kicker-badge">
          <span className="heart-icon">♥</span>
          <span>PATIENT CARDIAC SURVEILLANCE & EARLY RISK DETECTION</span>
        </div>

        <h1 className="clean-hero-title">
          PROTECTING PATIENT HEARTS WITH <span className="accent-highlight">INTELLIGENT SURVEILLANCE</span>
        </h1>

        <p className="clean-hero-lead">
          Cardiovascular disease is the world’s leading health challenge. CardioWatch monitors physiological vitals—blood pressure, cholesterol, maximum heart rate, and ST depression—identifying cardiac risk while ensuring diagnostic models remain accurate, unbiased, and safe across all patient groups.
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
              <strong className="drop-title">UPLOAD PATIENT CARDIAC RECORDS (.CSV)</strong>
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
            <span className="divider-label">OR EXPLORE WITH CLINICAL BENCHMARK</span>
            <span className="divider-line" />
          </div>

          <button
            type="button"
            className="kinetic-cta-button"
            id="use-sample-dataset-btn"
            onClick={onUseSample}
            disabled={loading}
          >
            {loading ? 'EVALUATING CARDIAC VITALS...' : 'TEST LIVE CARDIAC DATASET (200 PATIENTS) →'}
          </button>

          <p className="cta-micro-caption">
            Instantly evaluates reference Cleveland cardiac cohort with live patient predictions and drift audits.
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

      {/* 4. Bottom Ticker Marquee */}
      <div className="marquee-wrapper secondary-marquee" aria-hidden="true">
        <div className="marquee-track reverse">
          <span>PRIORITIZING SICK PATIENT DETECTION // MINIMIZING FALSE NEGATIVES // DETECTING SHIFTS IN BLOOD PRESSURE & CHOLESTEROL // AUDITING GENDER EQUITY // TABLEAU READY // </span>
          <span>PRIORITIZING SICK PATIENT DETECTION // MINIMIZING FALSE NEGATIVES // DETECTING SHIFTS IN BLOOD PRESSURE & CHOLESTEROL // AUDITING GENDER EQUITY // TABLEAU READY // </span>
        </div>
      </div>
    </div>
  );
}
