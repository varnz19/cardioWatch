import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { getExportDownloadUrl } from '../services/api';

const RISK_COLORS = {
  high: '#DC2626',      // Red
  moderate: '#D97706',  // Amber
  low: '#16A34A',       // Green
};

const SYMPTOM_COLORS = [
  '#2563EB', '#7C3AED', '#DB2777', '#EA580C'
];

export default function PowerBIInsights({ analysis, onNavigateToDataset }) {
  // Slicers / Interactive Filters
  const [filterSex, setFilterSex] = useState('ALL');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [filterAge, setFilterAge] = useState('ALL');
  const [filterChestPain, setFilterChestPain] = useState('ALL');
  const [donutCategory, setDonutCategory] = useState('risk'); // 'risk' | 'cp' | 'target'
  const [showTableauFeature, setShowTableauFeature] = useState(false);

  const rawPatients = analysis?.preview || [];

  // Filtered Patient Dataset
  const filteredPatients = useMemo(() => {
    return rawPatients.filter((p) => {
      // Sex filter
      if (filterSex === 'MALE' && p.sex_desc?.toLowerCase() !== 'male') return false;
      if (filterSex === 'FEMALE' && p.sex_desc?.toLowerCase() !== 'female') return false;

      // Risk filter
      const prob = p.predicted_probability ?? 0;
      const isHigh = p.risk_level?.includes('HIGH') || prob >= 0.70;
      const isMod = p.risk_level?.includes('MODERATE') || (prob >= 0.40 && prob < 0.70);
      const isLow = p.risk_level?.includes('LOW') || prob < 0.40;

      if (filterRisk === 'HIGH' && !isHigh) return false;
      if (filterRisk === 'MODERATE' && !isMod) return false;
      if (filterRisk === 'LOW' && !isLow) return false;

      // Age filter
      const age = p.age ?? 50;
      if (filterAge === 'YOUNGER' && age >= 55) return false;
      if (filterAge === 'SENIOR' && age < 55) return false;

      // Chest Pain filter
      if (filterChestPain !== 'ALL') {
        const cp = (p.cp_desc || '').toLowerCase();
        if (filterChestPain === 'TYPICAL' && !cp.includes('typical')) return false;
        if (filterChestPain === 'ATYPICAL' && !cp.includes('atypical')) return false;
        if (filterChestPain === 'NON_ANGINAL' && !cp.includes('non-anginal')) return false;
        if (filterChestPain === 'ASYMPTOMATIC' && !cp.includes('asymptomatic')) return false;
      }

      return true;
    });
  }, [rawPatients, filterSex, filterRisk, filterAge, filterChestPain]);

  // Aggregate Metrics for Current Slice
  const metrics = useMemo(() => {
    const total = filteredPatients.length;
    if (total === 0) {
      return {
        total: 0,
        highRiskCount: 0,
        highRiskPct: 0,
        modRiskCount: 0,
        modRiskPct: 0,
        lowRiskCount: 0,
        lowRiskPct: 0,
        avgBp: 0,
        avgChol: 0,
        avgMaxHr: 0,
        avgAge: 0,
        malePct: 0,
        femalePct: 0
      };
    }

    let high = 0;
    let mod = 0;
    let low = 0;
    let sumBp = 0;
    let sumChol = 0;
    let sumHr = 0;
    let sumAge = 0;
    let males = 0;

    filteredPatients.forEach((p) => {
      const prob = p.predicted_probability ?? 0;
      if (p.risk_level?.includes('HIGH') || prob >= 0.70) high += 1;
      else if (p.risk_level?.includes('MODERATE') || prob >= 0.40) mod += 1;
      else low += 1;

      sumBp += (p.trestbps || 0);
      sumChol += (p.chol || 0);
      sumHr += (p.thalach || 0);
      sumAge += (p.age || 0);

      if (p.sex_desc?.toLowerCase() === 'male' || p.sex === 1) males += 1;
    });

    return {
      total,
      highRiskCount: high,
      highRiskPct: Math.round((high / total) * 100),
      modRiskCount: mod,
      modRiskPct: Math.round((mod / total) * 100),
      lowRiskCount: low,
      lowRiskPct: Math.round((low / total) * 100),
      avgBp: Math.round(sumBp / total),
      avgChol: Math.round(sumChol / total),
      avgMaxHr: Math.round(sumHr / total),
      avgAge: Math.round((sumAge / total) * 10) / 10,
      malePct: Math.round((males / total) * 100),
      femalePct: Math.round(((total - males) / total) * 100)
    };
  }, [filteredPatients]);

  // 1. Waffle Chart Data (100 cells)
  const waffleCells = useMemo(() => {
    const cells = [];
    const highCells = Math.round(metrics.highRiskPct);
    const modCells = Math.round(metrics.modRiskPct);
    const lowCells = 100 - highCells - modCells;

    for (let i = 0; i < highCells; i++) cells.push({ id: i, type: 'high', label: 'High Risk' });
    for (let i = 0; i < modCells; i++) cells.push({ id: highCells + i, type: 'moderate', label: 'Moderate' });
    for (let i = 0; i < lowCells; i++) cells.push({ id: highCells + modCells + i, type: 'low', label: 'Low Risk' });

    return cells.slice(0, 100);
  }, [metrics]);

  // 2. Donut Chart Data
  const donutData = useMemo(() => {
    if (donutCategory === 'risk') {
      return [
        { name: 'High Cardiac Risk', value: metrics.highRiskCount, color: RISK_COLORS.high },
        { name: 'Moderate / Elevated', value: metrics.modRiskCount, color: RISK_COLORS.moderate },
        { name: 'Low Risk / Stable', value: metrics.lowRiskCount, color: RISK_COLORS.low }
      ].filter(d => d.value > 0);
    }

    if (donutCategory === 'cp') {
      const counts = { 'Typical Angina': 0, 'Atypical Angina': 0, 'Non-Anginal Pain': 0, 'Asymptomatic': 0 };
      filteredPatients.forEach(p => {
        const desc = p.cp_desc || 'Asymptomatic';
        if (desc.includes('Typical')) counts['Typical Angina'] += 1;
        else if (desc.includes('Atypical')) counts['Atypical Angina'] += 1;
        else if (desc.includes('Non-Anginal')) counts['Non-Anginal Pain'] += 1;
        else counts['Asymptomatic'] += 1;
      });
      return Object.entries(counts).map(([name, value], i) => ({
        name, value, color: SYMPTOM_COLORS[i % SYMPTOM_COLORS.length]
      })).filter(d => d.value > 0);
    }

    // Diagnostic target
    const tp = filteredPatients.filter(p => p.error_classification === 'True Positive').length;
    const tn = filteredPatients.filter(p => p.error_classification === 'True Negative').length;
    const fp = filteredPatients.filter(p => p.error_classification === 'False Positive').length;
    const fn = filteredPatients.filter(p => p.error_classification === 'False Negative').length;

    return [
      { name: 'True Positive (Correct Disease)', value: tp, color: '#16A34A' },
      { name: 'True Negative (Correct Healthy)', value: tn, color: '#2563EB' },
      { name: 'False Positive (Extra Triage)', value: fp, color: '#D97706' },
      { name: 'False Negative (Missed Disease)', value: fn, color: '#DC2626' }
    ].filter(d => d.value > 0);
  }, [donutCategory, metrics, filteredPatients]);

  // 3. Age Brackets vs Risk Breakdown Bar Chart Data
  const ageGroupData = useMemo(() => {
    const bins = [
      { label: '30-49 yrs', high: 0, mod: 0, low: 0 },
      { label: '50-59 yrs', high: 0, mod: 0, low: 0 },
      { label: '60-69 yrs', high: 0, mod: 0, low: 0 },
      { label: '70+ yrs', high: 0, mod: 0, low: 0 }
    ];

    filteredPatients.forEach(p => {
      const age = p.age || 50;
      let bin = bins[0];
      if (age >= 70) bin = bins[3];
      else if (age >= 60) bin = bins[2];
      else if (age >= 50) bin = bins[1];

      const prob = p.predicted_probability ?? 0;
      if (p.risk_level?.includes('HIGH') || prob >= 0.70) bin.high += 1;
      else if (p.risk_level?.includes('MODERATE') || prob >= 0.40) bin.mod += 1;
      else bin.low += 1;
    });

    return bins;
  }, [filteredPatients]);

  // 4. Biomarker Comparison Bar Data
  const biomarkerComparison = useMemo(() => {
    const younger = filteredPatients.filter(p => (p.age || 50) < 55);
    const senior = filteredPatients.filter(p => (p.age || 50) >= 55);

    const avg = (arr, key) => arr.length ? Math.round(arr.reduce((a, b) => a + (b[key] || 0), 0) / arr.length) : 0;

    return [
      { metric: 'Resting BP (mmHg)', Younger: avg(younger, 'trestbps'), Senior: avg(senior, 'trestbps'), Threshold: 130 },
      { metric: 'Cholesterol (mg/dL)', Younger: avg(younger, 'chol'), Senior: avg(senior, 'chol'), Threshold: 200 },
      { metric: 'Max Heart Rate (bpm)', Younger: avg(younger, 'thalach'), Senior: avg(senior, 'thalach'), Threshold: 150 }
    ];
  }, [filteredPatients]);

  // Tableau Export Files
  const tableauFiles = [
    { id: 'performance', title: 'Performance KPIs', file: 'monthly_performance_kpis.csv' },
    { id: 'drift', title: 'Feature Drift & PSI', file: 'feature_drift_metrics.csv' },
    { id: 'fairness', title: 'Subgroup Fairness', file: 'subgroup_fairness_audit.csv' },
    { id: 'patients', title: 'Patient Telemetry', file: 'patient_records_longitudinal.csv' }
  ];

  const resetAllSlicers = () => {
    setFilterSex('ALL');
    setFilterRisk('ALL');
    setFilterAge('ALL');
    setFilterChestPain('ALL');
  };

  const isFiltered = filterSex !== 'ALL' || filterRisk !== 'ALL' || filterAge !== 'ALL' || filterChestPain !== 'ALL';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Top Power BI Control Ribbon & Interactive Slicers */}
      <div className="card" style={{ padding: '16px 20px', backgroundColor: '#FFFFFF', border: '2px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-foreground)',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 8px',
                border: '1px solid var(--border)',
                letterSpacing: '0.06em'
              }}>
                POWER BI VISUAL ANALYTICS
              </span>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                Clinical Intelligence &amp; Data Insights
              </strong>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 3 }}>
              Interactive cohort slicing • Cross-filtered visuals • Waffle &amp; Donut distribution analytics
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              backgroundColor: '#F4F4F5',
              padding: '6px 12px',
              border: '1px solid var(--border)'
            }}>
              Active Cohort: <strong>{metrics.total}</strong> of {rawPatients.length} patients
            </span>

            {isFiltered && (
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.72rem', padding: '6px 10px', height: 'auto' }}
                onClick={resetAllSlicers}
              >
                Reset Slicers ✕
              </button>
            )}

            <button
              type="button"
              className={showTableauFeature ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.72rem', padding: '6px 12px', height: 'auto' }}
              onClick={() => setShowTableauFeature(!showTableauFeature)}
            >
              📊 Tableau Feature {showTableauFeature ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* Slicers Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, paddingTop: 12, borderTop: '1px solid #E4E4E7' }}>
          {/* Gender Slicer */}
          <div>
            <label style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Gender Slicer
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              {['ALL', 'MALE', 'FEMALE'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    border: '1px solid var(--border)',
                    backgroundColor: filterSex === opt ? 'var(--accent)' : '#FFFFFF',
                    color: filterSex === opt ? '#000000' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setFilterSex(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Slicer */}
          <div>
            <label style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Risk Tier Slicer
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              {['ALL', 'HIGH', 'MODERATE', 'LOW'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    border: '1px solid var(--border)',
                    backgroundColor: filterRisk === opt ? (opt === 'HIGH' ? '#FEE2E2' : opt === 'MODERATE' ? '#FEF3C7' : opt === 'LOW' ? '#DCFCE7' : 'var(--accent)') : '#FFFFFF',
                    color: filterRisk === opt ? (opt === 'HIGH' ? '#DC2626' : opt === 'MODERATE' ? '#92400E' : opt === 'LOW' ? '#166534' : '#000000') : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setFilterRisk(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Age Bracket Slicer */}
          <div>
            <label style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Age Bracket Slicer
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { key: 'ALL', label: 'All' },
                { key: 'YOUNGER', label: '< 55 yrs' },
                { key: 'SENIOR', label: '≥ 55 yrs' }
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    border: '1px solid var(--border)',
                    backgroundColor: filterAge === opt.key ? 'var(--accent)' : '#FFFFFF',
                    color: filterAge === opt.key ? '#000000' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setFilterAge(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chest Pain Slicer */}
          <div>
            <label style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Symptom Slicer
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { key: 'ALL', label: 'All' },
                { key: 'ASYMPTOMATIC', label: 'Asymptomatic' },
                { key: 'NON_ANGINAL', label: 'Non-Anginal' },
                { key: 'TYPICAL', label: 'Typical' }
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  style={{
                    flex: 1,
                    padding: '4px 4px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    border: '1px solid var(--border)',
                    backgroundColor: filterChestPain === opt.key ? 'var(--accent)' : '#FFFFFF',
                    color: filterChestPain === opt.key ? '#000000' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setFilterChestPain(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tableau Export Feature Drawer / Tile (When Toggled) */}
      {showTableauFeature && (
        <div className="card" style={{
          padding: '16px 20px',
          backgroundColor: '#F8FAFC',
          border: '2px dashed #0284C7',
          marginBottom: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>📊</span>
              <div>
                <strong style={{ fontSize: '0.85rem', color: '#0369A1', textTransform: 'uppercase' }}>
                  Tableau Export Feature
                </strong>
                <p style={{ fontSize: '0.72rem', color: '#0284C7', margin: 0 }}>
                  Tableau is integrated as an export feature. Download relational CSV tables ready for Tableau workbooks:
                </p>
              </div>
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, backgroundColor: '#E0F2FE', color: '#0369A1', padding: '3px 8px', border: '1px solid #7DD3FC' }}>
              4 NORMALIZED TABLES READY
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {tableauFiles.map(tf => (
              <a
                key={tf.id}
                href={getExportDownloadUrl(tf.id)}
                download={tf.file}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  textDecoration: 'none',
                  fontSize: '0.74rem'
                }}
              >
                <span>📥 {tf.title}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>.csv</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Power BI KPI Summary Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Selected Patients</span>
            <span className="brand-badge">COHORT</span>
          </div>
          <div className="metric-value">{metrics.total}</div>
          <div className="metric-subtext">Avg Age: {metrics.avgAge} yrs</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #DC2626' }}>
          <div className="metric-header">
            <span className="metric-label" style={{ color: '#991B1B' }}>High Risk Patients</span>
            <span className="status-badge attention">{metrics.highRiskPct}%</span>
          </div>
          <div className="metric-value" style={{ color: '#DC2626' }}>{metrics.highRiskCount}</div>
          <div className="metric-subtext">{metrics.highRiskPct}% of filtered slice</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #2563EB' }}>
          <div className="metric-header">
            <span className="metric-label">Avg Blood Pressure</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: metrics.avgBp > 130 ? '#DC2626' : '#16A34A' }}>
              {metrics.avgBp > 130 ? 'ELEVATED' : 'NORMAL'}
            </span>
          </div>
          <div className="metric-value">{metrics.avgBp} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>mmHg</span></div>
          <div className="metric-subtext">Clinical Normal: &lt;120</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div className="metric-header">
            <span className="metric-label">Avg Cholesterol</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: metrics.avgChol > 200 ? '#DC2626' : '#16A34A' }}>
              {metrics.avgChol > 200 ? 'HIGH' : 'NORMAL'}
            </span>
          </div>
          <div className="metric-value">{metrics.avgChol} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>mg/dL</span></div>
          <div className="metric-subtext">Desirable: &lt;200 mg/dL</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #16A34A' }}>
          <div className="metric-header">
            <span className="metric-label">Gender Balance</span>
            <span className="status-badge normal">SLICED</span>
          </div>
          <div className="metric-value" style={{ fontSize: '1.25rem', marginTop: 4 }}>
            {metrics.malePct}% <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>M</span> / {metrics.femalePct}% <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>F</span>
          </div>
          <div className="metric-subtext">Biological sex split</div>
        </div>
      </div>

      {/* Power BI Smart Narratives Card (Key Clinical Insights) */}
      <div className="card" style={{ backgroundColor: '#F0FDF4', border: '1.5px solid #86EFAC', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: '1.1rem' }}>💡</span>
          <strong style={{ fontSize: '0.84rem', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Power BI Smart Insights &amp; Clinical Findings
          </strong>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, fontSize: '0.78rem', color: '#14532D', lineHeight: 1.5 }}>
          <div style={{ padding: '8px 12px', backgroundColor: '#FFFFFF', border: '1px solid #BBF7D0' }}>
            <strong>1. Primary Risk Driver:</strong> In this slice, <strong>{metrics.highRiskPct}%</strong> of patients exhibit high cardiac risk. Asymptomatic chest pain remains the single strongest indicator of occult disease.
          </div>
          <div style={{ padding: '8px 12px', backgroundColor: '#FFFFFF', border: '1px solid #BBF7D0' }}>
            <strong>2. Vital Sign Pressure:</strong> Resting blood pressure averages <strong>{metrics.avgBp} mmHg</strong>, with elevated cholesterol averaging <strong>{metrics.avgChol} mg/dL</strong>, indicating cardiovascular metabolic strain.
          </div>
          <div style={{ padding: '8px 12px', backgroundColor: '#FFFFFF', border: '1px solid #BBF7D0' }}>
            <strong>3. Exercise Tolerance:</strong> Maximum achieved heart rate averages <strong>{metrics.avgMaxHr} bpm</strong>; lower maximum heart rate strongly correlates with higher risk scores.
          </div>
        </div>
      </div>

      {/* Visual Analytics Row 1: WAFFLE CHART & DONUT CHART */}
      <div className="grid-2">

        {/* 1. WAFFLE CHART (10x10 Grid = 100 Squares) */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Waffle Chart: Patient Risk Breakdown</h3>
              <p>100-cell proportional grid representing the current patient population (1 square ≈ 1%)</p>
            </div>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              backgroundColor: '#F4F4F5',
              padding: '3px 8px',
              border: '1px solid var(--border)'
            }}>
              10 × 10 GRID
            </span>
          </div>

          <div className="card-body">
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* The 10x10 Waffle Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 18px)',
                gridTemplateRows: 'repeat(10, 18px)',
                gap: 3,
                padding: 10,
                backgroundColor: '#FFFFFF',
                border: '2px solid var(--border)',
                alignSelf: 'center'
              }}>
                {waffleCells.map(cell => (
                  <div
                    key={cell.id}
                    title={`${cell.label}`}
                    style={{
                      width: 18,
                      height: 18,
                      backgroundColor: RISK_COLORS[cell.type],
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'transform 0.1s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  />
                ))}
              </div>

              {/* Side Breakdown & Legend */}
              <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, backgroundColor: RISK_COLORS.high, borderRadius: 2 }} />
                    <strong style={{ fontSize: '0.78rem', color: '#991B1B' }}>High Cardiac Risk</strong>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#DC2626' }}>
                    {metrics.highRiskPct}% ({metrics.highRiskCount})
                  </span>
                </div>

                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, backgroundColor: RISK_COLORS.moderate, borderRadius: 2 }} />
                    <strong style={{ fontSize: '0.78rem', color: '#92400E' }}>Moderate / Elevated</strong>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#D97706' }}>
                    {metrics.modRiskPct}% ({metrics.modRiskCount})
                  </span>
                </div>

                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#DCFCE7',
                  border: '1px solid #86EFAC',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, backgroundColor: RISK_COLORS.low, borderRadius: 2 }} />
                    <strong style={{ fontSize: '0.78rem', color: '#166534' }}>Low Risk / Stable</strong>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#16A34A' }}>
                    {metrics.lowRiskPct}% ({metrics.lowRiskCount})
                  </span>
                </div>
              </div>
            </div>

            <p style={{ marginTop: 12, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Power BI Waffle Visual: Highlights proportional health distribution. Red squares require expedited clinical evaluation.
            </p>
          </div>
        </div>

        {/* 2. DONUT / PIE CHART */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Interactive Donut Chart</h3>
              <p>Categorical distribution breakdown for active patient slice</p>
            </div>
            {/* Category Toggle Tabs */}
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { key: 'risk', label: 'Risk Tiers' },
                { key: 'cp', label: 'Chest Pain' },
                { key: 'target', label: 'Diagnosis' }
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    border: '1px solid var(--border)',
                    backgroundColor: donutCategory === tab.key ? 'var(--accent)' : '#FFFFFF',
                    color: donutCategory === tab.key ? '#000000' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setDonutCategory(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card-body">
            <div style={{ height: 230, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#18181B" strokeWidth={1.5} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#18181B', borderWidth: 2 }}
                    formatter={(val, name) => [`${val} patients (${Math.round((val / (metrics.total || 1)) * 100)}%)`, name]}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '0.72rem', paddingTop: 8 }} />
                </PieChart>
              </ResponsiveContainer>

              {/* Central KPI callout */}
              <div style={{
                position: 'absolute',
                top: '42%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {donutCategory === 'risk' ? `${metrics.highRiskPct}%` : `${metrics.total}`}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {donutCategory === 'risk' ? 'Elevated' : 'Patients'}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Visual Analytics Row 2: MULTI-METRIC COLUMN & AGE GROUP BREAKDOWN */}
      <div className="grid-2">

        {/* 3. Multi-Metric Column Bar Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Biomarker Comparison: Younger vs Senior Cohorts</h3>
              <p>Average blood pressure, cholesterol, and heart rate across age groups</p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={biomarkerComparison} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                  <XAxis dataKey="metric" tick={{ fontSize: 10, fill: '#52525B' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#52525B' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#18181B', borderWidth: 2 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: 6 }} />
                  <Bar dataKey="Younger" name="Younger (<55 yrs)" fill="#2563EB" stroke="#18181B" strokeWidth={1} />
                  <Bar dataKey="Senior" name="Senior (≥55 yrs)" fill="#D97706" stroke="#18181B" strokeWidth={1} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Power BI Column Comparison: Shows the clear biomarker divergence as patient populations age.
            </div>
          </div>
        </div>

        {/* 4. Age Groups vs Risk Distribution Stacked Columns */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Age Buckets vs Risk Severity Distribution</h3>
              <p>Patient volume across age brackets segmented by calculated cardiac risk level</p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageGroupData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#52525B' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#52525B' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#18181B', borderWidth: 2 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: 6 }} />
                  <Bar dataKey="high" name="High Risk" stackId="a" fill={RISK_COLORS.high} stroke="#18181B" strokeWidth={1} />
                  <Bar dataKey="mod" name="Moderate" stackId="a" fill={RISK_COLORS.moderate} stroke="#18181B" strokeWidth={1} />
                  <Bar dataKey="low" name="Low Risk" stackId="a" fill={RISK_COLORS.low} stroke="#18181B" strokeWidth={1} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Stack Distribution: Risk severity concentrates heavily in the 50-69 demographic bracket.
            </div>
          </div>
        </div>

      </div>

      {/* Action Footer Callout */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        backgroundColor: '#FFFFFF',
        border: '2px solid var(--border)'
      }}>
        <div>
          <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
            Explore Patient Record Telemetry
          </strong>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Review row-by-row patient risk classifications, confusion matrix flags, and search individual records.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={onNavigateToDataset}
        >
          VIEW COMPLETE PATIENT RECORDS →
        </button>
      </div>

    </div>
  );
}
