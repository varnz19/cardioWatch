import React, { useState, useRef } from 'react';

const LEFT_NOTES = [
  {
    step: '01',
    title: 'You bring the patients',
    body: 'Drop in a CSV of patient records: age, blood pressure, cholesterol, heart rate and whether they truly had heart disease.'
  },
  {
    step: '02',
    title: 'A real model scores everyone',
    body: 'A Random Forest trained on the UCI Cleveland data predicts a risk probability for every single row, live.'
  },
  {
    step: '03',
    title: 'Accuracy hides mistakes',
    body: 'A model can look 90% accurate and still send sick patients home. We track the false negative rate for exactly that reason.'
  }
];

const RIGHT_NOTES = [
  {
    step: '04',
    title: 'Is the crowd changing?',
    body: 'Kolmogorov-Smirnov tests compare your new patients against the training population, feature by feature, to catch drift early.'
  },
  {
    step: '05',
    title: 'Is it fair to everyone?',
    body: 'We split results by sex and age group and compare recall. A big gap means the model misses disease more often in one group.'
  },
  {
    step: '06',
    title: 'Then take it to Tableau',
    body: 'Every result is packaged as clean CSV files, ready to drag into Tableau and build your own dashboards.'
  }
];

function FloatingNote({ note, index, side }) {
  return (
    <div
      className={`float-note float-${side}`}
      style={{ animationDelay: `${index * 0.9}s`, marginLeft: side === 'left' ? index * 18 : 0, marginRight: side === 'right' ? index * 18 : 0 }}
    >
      <span className="float-note-step">{note.step}</span>
      <h3>{note.title}</h3>
      <p>{note.body}</p>
    </div>
  );
}

export default function Landing({ onAnalyze, onUseSample, loading, error }) {
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setLocalError('That is not a CSV file. Please choose a .csv file.');
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

  const shownError = localError || error;

  return (
    <section className="landing">
      <div className="landing-notes landing-notes-left">
        {LEFT_NOTES.map((n, i) => (
          <FloatingNote key={n.step} note={n} index={i} side="left" />
        ))}
      </div>

      <div className="landing-center">
        <p className="landing-kicker">CardioWatch</p>
        <h1 className="landing-title">Is your heart disease model still telling the truth?</h1>
        <p className="landing-lead">
          Upload patient data and CardioWatch checks how well the model performs, whether new patients look different
          from the ones it learned on, and whether it treats everyone equally.
        </p>

        <div
          className={`landing-drop ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          role="button"
          tabIndex={0}
          id="landing-dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files && e.target.files[0])}
          />
          <strong>Upload a patient CSV</strong>
          <span>Drag a file here, or click to browse</span>
          <small>Columns: age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal, target</small>
        </div>

        {shownError && <div className="landing-error">{shownError}</div>}

        <div className="landing-or"><span>or</span></div>

        <button
          type="button"
          className="landing-sample-btn"
          id="use-sample-btn"
          onClick={onUseSample}
          disabled={loading}
        >
          Use the sample dataset
        </button>
        <p className="landing-sample-hint">A ready made cohort of 200 patients so you can see everything working at once.</p>
      </div>

      <div className="landing-notes landing-notes-right">
        {RIGHT_NOTES.map((n, i) => (
          <FloatingNote key={n.step} note={n} index={i + 3} side="right" />
        ))}
      </div>
    </section>
  );
}
