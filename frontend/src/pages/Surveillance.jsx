import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import MetricCard from '../components/MetricCard';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid
} from 'recharts';
import { getAuditHistory, getDriftPowerSweep } from '../services/api';

export default function Surveillance({ analysis, onNavigateToExport }) {
  const [historyBatches, setHistoryBatches] = useState([]);
  const [powerSweepFeature, setPowerSweepFeature] = useState('trestbps');
  const [powerSweepData, setPowerSweepData] = useState(null);
  const [loadingSweep, setLoadingSweep] = useState(false);

  // Load audit history from SQLite
  useEffect(() => {
    getAuditHistory(30)
      .then((res) => {
        if (res?.batches) {
          setHistoryBatches(res.batches);
        }
      })
      .catch((err) => console.error('[Surveillance] History load error:', err));
  }, [analysis?.batch_id]);

  // Load power sweep data
  useEffect(() => {
    setLoadingSweep(true);
    getDriftPowerSweep(powerSweepFeature)
      .then((res) => {
        if (res?.power_sweep) {
          setPowerSweepData(res.power_sweep);
        }
      })
      .catch((err) => console.error('[Surveillance] Sweep load error:', err))
      .finally(() => setLoadingSweep(false));
  }, [powerSweepFeature]);

  if (!analysis) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '-0.01em' }}>
          NO ACTIVE PATIENT BATCH INGESTED
        </h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto 24px auto', fontSize: '0.85rem', lineHeight: 1.6 }}>
          All batch audit metrics—including Kolmogorov-Smirnov drift statistics with Benjamini-Hochberg FDR control, Population Stability Index (PSI), confusion matrix false negative rates, and 1,000-resample bootstrap fairness confidence intervals—are computed live.
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => window.location.reload()}
        >
          GO TO BATCH INGESTION →
        </button>
      </div>
    );
  }

  const { performance, drift, fairness, metadata, is_synthetic, generation_notes, batch_id, limitation_note } = analysis;

  const hasPerf = performance && performance.has_performance !== false;
  const acc = hasPerf ? `${(performance.accuracy * 100).toFixed(1)}%` : 'N/A';
  const rec = hasPerf ? `${(performance.recall * 100).toFixed(1)}%` : 'N/A';
  const fnr = hasPerf ? `${(performance.false_negative_rate * 100).toFixed(1)}%` : 'N/A';

  const cm = performance?.confusion_matrix || { true_positive: 0, false_positive: 0, false_negative: 0, true_negative: 0, total: 1 };
  const cmTotal = cm.total || 1;
  const tpPct = ((cm.true_positive / cmTotal) * 100).toFixed(1);
  const tnPct = ((cm.true_negative / cmTotal) * 100).toFixed(1);
  const fpPct = ((cm.false_positive / cmTotal) * 100).toFixed(1);
  const fnPct = ((cm.false_negative / cmTotal) * 100).toFixed(1);

  const driftStatus = drift ? drift.overall_status : 'Normal';
  const maxGap = fairness && fairness.has_fairness_analysis ? `${fairness.max_fnr_gap_points}%` : '0.0%';
  const fairnessStatus = fairness ? fairness.overall_status : 'Normal';

  // Feature drift table data
  const featureDriftList = drift?.feature_drift_table || [];

  const getStatusColor = (status) => {
    if (status === 'HIGH' || status === 'Attention' || status === 'CRITICAL_DRIFT') return '#DC2626';
    if (status === 'MEDIUM' || status === 'Monitor' || status === 'MODERATE_SHIFT') return '#D97706';
    return '#16A34A';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Scientific Limitation & Research Prototype Disclaimer */}
      <div style={{
        padding: '12px 18px',
        backgroundColor: '#FEF3C7',
        border: '2px solid #F59E0B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <div>
            <strong style={{ fontSize: '0.8rem', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              RESEARCH PROTOTYPE NOTICE
            </strong>
            <p style={{ fontSize: '0.76rem', color: '#78350F', margin: 0, marginTop: 2 }}>
              {limitation_note || 'CardioWatch is an academic research prototype for machine learning auditing and education, not a certified clinical diagnostic tool.'}
            </p>
          </div>
        </div>
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#92400E',
          backgroundColor: '#FDE68A',
          padding: '4px 8px',
          border: '1px solid #D97706',
          whiteSpace: 'nowrap'
        }}>
          AUDITING ENGINE
        </span>
      </div>

      {/* Synthetic Cohort Disclosure Banner (if synthetic) */}
      {is_synthetic && (
        <div style={{
          padding: '14px 18px',
          backgroundColor: '#F3E8FF',
          border: '2px solid #9333EA',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.82rem', color: '#6B21A8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              🧪 SYNTHETIC STRESS-TEST COHORT ACTIVE
            </strong>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#581C87', backgroundColor: '#E9D5FF', padding: '3px 8px', border: '1px solid #A855F7' }}>
              SIMULATED PERTURBATION
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#581C87', margin: 0, lineHeight: 1.5 }}>
            <strong>Generation Methodology:</strong> {generation_notes}
          </p>
        </div>
      )}

      {/* Top 3 Core Pillar Status Header */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <MetricCard
          label="Pillar 1: Diagnostic Accuracy"
          value={acc}
          subtext={`Sensitivity ${rec} | FNR ${fnr}`}
          status={hasPerf && performance.accuracy < 0.80 ? 'Attention' : 'Normal'}
        />
        <MetricCard
          label="Pillar 2: Covariate Drift (KS + PSI)"
          value={driftStatus}
          subtext={`${drift.high_drift_count} high-drift features (BH FDR controlled)`}
          status={driftStatus}
        />
        <MetricCard
          label="Pillar 3: Demographic Equity"
          value={maxGap}
          subtext="Peak subgroup FNR disparity gap"
          status={fairnessStatus}
        />
      </div>

      {/* PILLAR 1: Diagnostic Accuracy & Confusion Matrix */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Pillar 1: Model Performance & Error Auditing</h3>
            <p>Evaluates diagnostic point estimates; audits and flags clinical false negatives</p>
          </div>
          <StatusBadge status={hasPerf && performance.false_negative_rate > 0.15 ? 'Attention' : 'Normal'} label={`Batch FNR: ${fnr}`} />
        </div>
        <div className="card-body">
          <div className="cm-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="cm-cell" style={{ padding: 14, backgroundColor: '#FFFFFF', border: '2px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>True Positive (TP)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>{cm.true_positive}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tpPct}% correct positive detection</div>
            </div>

            <div className="cm-cell" style={{ padding: 14, backgroundColor: '#FFFFFF', border: '2px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--state-monitor-text)', textTransform: 'uppercase', fontWeight: 700 }}>False Positive (FP)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--state-monitor-text)', margin: '4px 0' }}>{cm.false_positive}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fpPct}% unnecessary triage</div>
            </div>

            <div className="cm-cell" style={{ padding: 14, backgroundColor: '#FEE2E2', border: '2px solid var(--state-attention)' }}>
              <div style={{ fontSize: '0.72rem', color: '#991B1B', fontWeight: 700, textTransform: 'uppercase' }}>False Negative (FN)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#DC2626', margin: '4px 0' }}>{cm.false_negative}</div>
              <div style={{ fontSize: '0.72rem', color: '#991B1B', fontWeight: 600 }}>{fnPct}% flagged missed disease cases</div>
            </div>

            <div className="cm-cell" style={{ padding: 14, backgroundColor: '#FFFFFF', border: '2px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>True Negative (TN)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>{cm.true_negative}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tnPct}% confirmed absence</div>
            </div>
          </div>
        </div>
      </div>

      {/* PILLAR 2: Feature Drift Table with KS Effect Size & PSI */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Pillar 2: Covariate Drift & Stability Audit</h3>
            <p>Two-Sample Kolmogorov-Smirnov test with Benjamini-Hochberg (BH) FDR correction and Population Stability Index (PSI)</p>
          </div>
          <StatusBadge status={driftStatus} />
        </div>
        <div className="card-body">
          <div style={{ overflowX: 'auto' }}>
            <table className="kinetic-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', backgroundColor: '#F4F4F5' }}>
                  <th style={{ padding: '8px 12px' }}>BIOMARKER</th>
                  <th style={{ padding: '8px 12px' }}>KS STATISTIC (D) [EFFECT SIZE]</th>
                  <th style={{ padding: '8px 12px' }}>RAW p-VALUE</th>
                  <th style={{ padding: '8px 12px' }}>FDR q-VALUE (BH ADJ)</th>
                  <th style={{ padding: '8px 12px' }}>PSI SCORE</th>
                  <th style={{ padding: '8px 12px' }}>POPULATION STABILITY</th>
                  <th style={{ padding: '8px 12px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {featureDriftList.map((f, idx) => {
                  const isSig = f.is_statistically_significant_fdr ?? (f.p_value_adjusted < 0.05);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{f.feature}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {f.ks_statistic?.toFixed(4) ?? '0.0000'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                        {f.p_value_raw < 0.0001 ? '< 0.0001' : f.p_value_raw?.toFixed(4)}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: isSig ? 700 : 400, color: isSig ? '#DC2626' : 'var(--text-secondary)' }}>
                        {f.p_value_adjusted < 0.0001 ? '< 0.0001' : f.p_value_adjusted?.toFixed(4)}
                        {isSig ? ' *' : ''}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>
                        {f.psi_score?.toFixed(4) ?? '0.0000'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 6px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: f.psi_score >= 0.20 ? '#FEE2E2' : (f.psi_score >= 0.10 ? '#FEF3C7' : '#DCFCE7'),
                          color: f.psi_score >= 0.20 ? '#991B1B' : (f.psi_score >= 0.10 ? '#92400E' : '#166534'),
                          border: '1px solid currentColor'
                        }}>
                          {f.psi_score >= 0.20 ? 'CRITICAL (≥0.20)' : (f.psi_score >= 0.10 ? 'MODERATE (0.10-0.20)' : 'STABLE (<0.10)')}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          fontWeight: 800,
                          color: getStatusColor(f.status),
                          fontSize: '0.74rem'
                        }}>
                          {f.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>* Statistically significant under Benjamini-Hochberg False Discovery Rate control (α = 0.05).</span>
            <span>Effect size interpretation: KS D &gt; 0.20 indicates substantial distribution divergence.</span>
          </div>
        </div>
      </div>

      {/* STATISTICAL POWER ANALYSIS: Detection Sweep */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Detection Sweep: Statistical Power Analysis</h3>
            <p>Empirical sensitivity test: shifts biomarker by 0.10, 0.25, 0.50, and 1.00 SD to identify the exact threshold where KS and PSI detect covariate divergence</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={powerSweepFeature === 'trestbps' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => setPowerSweepFeature('trestbps')}
            >
              Resting BP (`trestbps`)
            </button>
            <button
              type="button"
              className={powerSweepFeature === 'chol' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => setPowerSweepFeature('chol')}
            >
              Cholesterol (`chol`)
            </button>
          </div>
        </div>
        <div className="card-body">
          {loadingSweep ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Calculating power sweep resamples...</p>
          ) : powerSweepData ? (
            <div>
              <div style={{ marginBottom: 12, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Baseline Reference: Mean = <strong>{powerSweepData.baseline_mean}</strong>, SD (σ) = <strong>{powerSweepData.baseline_std}</strong> | First Consensus Flag: <strong>{powerSweepData.first_detected_at_sd} SD</strong>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="kinetic-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F4F4F5', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>SHIFT (SD)</th>
                      <th style={{ padding: '8px 10px' }}>MAGNITUDE (UNITS)</th>
                      <th style={{ padding: '8px 10px' }}>SIMULATED MEAN</th>
                      <th style={{ padding: '8px 10px' }}>KS STATISTIC (D)</th>
                      <th style={{ padding: '8px 10px' }}>KS p-VALUE</th>
                      <th style={{ padding: '8px 10px' }}>KS FLAGGED?</th>
                      <th style={{ padding: '8px 10px' }}>PSI SCORE</th>
                      <th style={{ padding: '8px 10px' }}>PSI FLAGGED?</th>
                      <th style={{ padding: '8px 10px' }}>DETECTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {powerSweepData.sweep_table?.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>+{row.shift_sd.toFixed(2)} σ</td>
                        <td style={{ padding: '8px 10px' }}>+{row.shift_magnitude_units}</td>
                        <td style={{ padding: '8px 10px' }}>{row.simulated_mean}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600 }}>{row.ks_statistic.toFixed(4)}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                          {row.ks_p_value < 0.0001 ? '< 0.0001' : row.ks_p_value.toFixed(4)}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontWeight: 700, color: row.ks_flagged ? '#DC2626' : '#16A34A' }}>
                            {row.ks_flagged ? 'FLAGGED (p<0.05)' : 'NOT FLAGGED'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600 }}>{row.psi_score.toFixed(4)}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontWeight: 700, color: row.psi_flagged ? '#D97706' : '#16A34A' }}>
                            {row.psi_flagged ? 'FLAGGED (≥0.10)' : 'NOT FLAGGED'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            padding: '3px 8px',
                            fontWeight: 800,
                            fontSize: '0.7rem',
                            backgroundColor: row.detection_consensus === 'DETECTED' ? '#DC2626' : (row.detection_consensus === 'PARTIAL' ? '#FEF3C7' : '#F4F4F5'),
                            color: row.detection_consensus === 'DETECTED' ? '#FFFFFF' : (row.detection_consensus === 'PARTIAL' ? '#92400E' : 'var(--text-secondary)')
                          }}>
                            {row.detection_consensus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ marginTop: 10, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Interview Note: Rather than relying on arbitrary ad-hoc synthetic shifts, this power sweep calibrates the minimum detectable effect size, validating that KS flags shift as subtle as 0.25 SD.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* PILLAR 3: Defensible Demographic Fairness with 95% Bootstrap CIs */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Pillar 3: Defensible Subgroup Fairness Audit</h3>
            <p>Empirical 95% Bootstrap Confidence Intervals (1,000 resamples via NumPy) on Recall, FNR, and paired disparity gaps</p>
          </div>
          <StatusBadge status={fairnessStatus} />
        </div>
        <div className="card-body">
          {fairness?.audits ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {fairness.audits.map((audit, idx) => {
                const isSig = audit.is_statistically_significant;
                return (
                  <div key={idx} style={{
                    padding: 16,
                    backgroundColor: '#FFFFFF',
                    border: '2px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                          Cohort Slice: {audit.attribute_type}
                        </strong>
                        <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          (1,000 bootstrap resamples)
                        </span>
                      </div>
                      <StatusBadge status={audit.status} />
                    </div>

                    {/* Subgroup Metrics with 95% CIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
                      {audit.subgroups.map((sub, sIdx) => (
                        <div key={sIdx} style={{ padding: 12, backgroundColor: '#F9FAFB', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{sub.group}</strong>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>n = {sub.sample_size} ({sub.positive_cases} positives)</span>
                          </div>

                          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.76rem' }}>
                            <div>
                              <span style={{ color: 'var(--text-secondary)' }}>Recall (Sensitivity): </span>
                              <strong style={{ color: 'var(--text-primary)' }}>{(sub.recall * 100).toFixed(1)}%</strong>
                              <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                                [95% CI: {(sub.recall_ci[0] * 100).toFixed(1)}% – {(sub.recall_ci[1] * 100).toFixed(1)}%]
                              </span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-secondary)' }}>False Negative Rate (FNR): </span>
                              <strong style={{ color: sub.fnr > 0.15 ? '#DC2626' : 'var(--text-primary)' }}>{(sub.fnr * 100).toFixed(1)}%</strong>
                              <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                                [95% CI: {(sub.fnr_ci[0] * 100).toFixed(1)}% – {(sub.fnr_ci[1] * 100).toFixed(1)}%]
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Honest Statistical Assessment */}
                    <div style={{
                      padding: 10,
                      backgroundColor: isSig ? '#FEE2E2' : '#EFF6FF',
                      border: `1px solid ${isSig ? '#F87171' : '#93C5FD'}`,
                      fontSize: '0.78rem',
                      color: isSig ? '#991B1B' : '#1E40AF',
                      lineHeight: 1.5
                    }}>
                      <strong>Scientific Finding: </strong>
                      {audit.observation}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No ground-truth target available for fairness audit.</p>
          )}
        </div>
      </div>

      {/* PILLAR 4: Batch Auditing Over Time (SQLite Repository) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Batch Auditing Over Time (SQLite History)</h3>
            <p>Chronological registry of every evaluated patient batch, tracking longitudinal performance, drift, and fairness</p>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {historyBatches.length} AUDITED BATCHES RECORDED
          </span>
        </div>
        <div className="card-body">
          {historyBatches.length > 1 ? (
            <div style={{ height: 220, marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyBatches} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                  <XAxis dataKey="batch_name" tick={{ fontSize: 10, fill: '#71717A' }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#71717A' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#18181B', borderWidth: 2 }}
                    formatter={(val, name) => [typeof val === 'number' ? (val * 100).toFixed(1) + '%' : val, name]}
                  />
                  <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="recall" name="Sensitivity (Recall)" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="fnr" name="False Negative Rate" stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          <div style={{ overflowX: 'auto' }}>
            <table className="kinetic-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F4F4F5', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 10px' }}>BATCH ID</th>
                  <th style={{ padding: '6px 10px' }}>COHORT NAME</th>
                  <th style={{ padding: '6px 10px' }}>TIMESTAMP (UTC)</th>
                  <th style={{ padding: '6px 10px' }}>TYPE</th>
                  <th style={{ padding: '6px 10px' }}>PATIENTS</th>
                  <th style={{ padding: '6px 10px' }}>ACCURACY</th>
                  <th style={{ padding: '6px 10px' }}>FNR</th>
                  <th style={{ padding: '6px 10px' }}>DRIFT</th>
                  <th style={{ padding: '6px 10px' }}>FAIRNESS STATUS</th>
                </tr>
              </thead>
              <tbody>
                {historyBatches.map((b, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{b.batch_id}</td>
                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>{b.batch_name}</td>
                    <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{b.timestamp?.replace('T', ' ').slice(0, 19)}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{
                        padding: '2px 6px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        backgroundColor: b.is_synthetic ? '#E9D5FF' : '#DCFCE7',
                        color: b.is_synthetic ? '#581C87' : '#166534'
                      }}>
                        {b.is_synthetic ? 'SYNTHETIC' : 'CLINICAL'}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px' }}>{b.total_patients}</td>
                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>{b.accuracy !== null ? `${(b.accuracy * 100).toFixed(1)}%` : 'N/A'}</td>
                    <td style={{ padding: '6px 10px', color: b.fnr > 0.15 ? '#DC2626' : 'inherit', fontWeight: 600 }}>
                      {b.fnr !== null ? `${(b.fnr * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{ fontWeight: 700, color: getStatusColor(b.overall_drift_status) }}>
                        {b.overall_drift_status} ({b.high_drift_count} high)
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{ fontWeight: 700, color: getStatusColor(b.fairness_status) }}>
                        {b.fairness_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ready for Tableau Export Callout */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        backgroundColor: '#FFFFFF',
        border: '2px solid var(--border)',
      }}>
        <div>
          <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Audited Cohort Ready for Tableau</strong>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            All patient predictions, bootstrap confidence intervals, KS drift stats, and longitudinal history can be exported as structured CSVs.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={onNavigateToExport}
        >
          DOWNLOAD TABLEAU CSVs →
        </button>
      </div>

    </div>
  );
}
