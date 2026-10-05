import React, { useState, useRef } from 'react';

const CARDIAC_STEPS = [
  {
    num: '01',
    category: 'HEALTH DATA',
    title: 'PATIENT HEALTH RECORDS',
    desc: 'Upload standard heart health records including age, sex, blood pressure, cholesterol, heart rate, and chest symptoms.',
    badge: 'HEALTH VITALS'
  },
  {
    num: '02',
    category: 'PREDICTION',
    title: 'CARDIAC RISK SCORING',
    desc: 'Machine learning analyzes patient health patterns to calculate the likelihood of heart disease for early detection.',
    badge: 'RISK SCORE'
  },
  {
    num: '03',
    category: 'ACCURACY',
    title: 'AVOIDING MISSED CASES',
    desc: 'Monitors false negatives closely so high-risk patients are not overlooked or dismissed as healthy.',
    badge: 'PATIENT SAFETY'
  },
  {
    num: '04',
    category: 'MONITORING',
    title: 'HEALTH PATTERNS OVER TIME',
    desc: 'Tracks whether patient vitals and demographics in new cohorts are shifting compared to past records.',
    badge: 'TREND CHECK'
  },
  {
    num: '05',
    category: 'FAIRNESS',
    title: 'FAIRNESS ACROSS GROUPS',
    desc: 'Audits diagnostic performance across gender and age groups to ensure fair outcomes for all patients.',
    badge: 'FAIRNESS'
  },
  {
    num: '06',
    category: 'REPORTS',
    title: 'TABLEAU & EXCEL EXPORTS',
    desc: 'Download all patient risk scores, trends, and summary tables to CSV ready for Tableau or Excel dashboards.',
    badge: 'CSV EXPORT'
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
          <span>HEART HEALTH &amp; MACHINE LEARNING</span>
        </div>

        <h1 className="clean-hero-title">
          CARDIAC RISK PREDICTION &amp; <span className="accent-highlight">HEALTH MONITORING</span>
        </h1>

        <p className="clean-hero-lead">
          Predict heart disease risk for patients, track changes in health metrics over time, and ensure fair outcomes across all patient groups.
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
              <strong className="drop-title">UPLOAD DATA (.CSV)</strong>
              <span className="drop-subtitle">DRAG &amp; DROP CSV FILE HERE, OR CLICK TO BROWSE</span>
            </div>
          </div>

          {displayError && (
            <div className="kinetic-error-banner">
              <strong>ALERT:</strong> {displayError}
            </div>
          )}

          <div className="kinetic-divider-row">
            <span className="divider-line" />
            <span className="divider-label">OR</span>
            <span className="divider-line" />
          </div>

          <button
            type="button"
            className="kinetic-cta-button"
            id="use-sample-dataset-btn"
            onClick={() => onUseSample('pooled')}
            disabled={loading}
          >
            {loading ? 'LOADING DATASET...' : 'USE SAMPLE DATASET →'}
          </button>

          <p className="cta-micro-caption">
            Instantly explore live predictions, health trends, and fairness metrics with real patient records.
          </p>
        </div>
      </section>

      {/* 2. Scrollable Workflow Section */}
      <section className="scrollable-workflow-section">
        <div className="workflow-header-row">
          <div>
            <span className="workflow-kicker">STEP-BY-STEP WORKFLOW</span>
            <h2 className="workflow-title">HOW IT WORKS</h2>
            <p className="workflow-subtitle">Explore how patient data is analyzed, monitored, and audited</p>
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
