import React from 'react';
import StatusBadge from '../components/StatusBadge';
import MetricCard from '../components/MetricCard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function Surveillance({ analysis, onNavigateToExport }) {
  if (!analysis) return null;

  const { performance, drift, fairness } = analysis;

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

  // Continuous and categorical feature drift rankings
  const topDrifting = (drift?.feature_drift_table || []).slice(0, 5).map(f => ({
    name: f.feature,
    score: f.drift_score,
    p_value: f.p_value,
    status: f.status
  }));

  const getBarColor = (status) => {
    if (status === 'HIGH') return '#b3423a';
    if (status === 'MEDIUM') return '#a8741a';
    return '#3d7a4f';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top 3 Core Pillar Status Header */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <MetricCard
          label="Pillar 1: Model Performance"
          value={acc}
          subtext={`Accuracy baseline (${rec} sensitivity, ${fnr} FNR)`}
          status={hasPerf && performance.accuracy < 0.80 ? 'Attention' : 'Normal'}
        />
        <MetricCard
          label="Pillar 2: Data Drift (KS-Test)"
          value={driftStatus}
          subtext={`${drift.high_drift_count} high-drift features detected`}
          status={driftStatus}
        />
        <MetricCard
          label="Pillar 3: Demographic Fairness"
          value={maxGap}
          subtext="Peak subgroup FNR disparity gap"
          status={fairnessStatus}
        />
      </div>

      {/* PILLAR 1: Model Diagnostic Performance & Confusion Matrix */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Pillar 1: Model Performance & Confusion Matrix</h3>
            <p>Evaluation against patient ground-truth diagnostic targets</p>
          </div>
          <StatusBadge status={hasPerf && performance.false_negative_rate > 0.15 ? 'Attention' : 'Normal'} label={`FNR: ${fnr}`} />
        </div>
        <div className="card-body">
          <div className="cm-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="cm-cell" style={{ padding: 14, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>True Positive (TP)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>{cm.true_positive}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tpPct}% of patients (Correct Disease Detection)</div>
            </div>

            <div className="cm-cell" style={{ padding: 14, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--state-monitor-text)', textTransform: 'uppercase' }}>False Positive (FP)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--state-monitor-text)', margin: '4px 0' }}>{cm.false_positive}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fpPct}% of patients (Unnecessary Triage)</div>
            </div>

            <div className="cm-cell" style={{ padding: 14, backgroundColor: 'rgba(179, 66, 58, 0.1)', border: '1px solid #b3423a', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: '#b3423a', fontWeight: 700, textTransform: 'uppercase' }}>False Negative (FN)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b3423a', margin: '4px 0' }}>{cm.false_negative}</div>
              <div style={{ fontSize: '0.72rem', color: '#b3423a' }}>{fnPct}% missed active cardiac risk (Critical Safety Risk)</div>
            </div>

            <div className="cm-cell" style={{ padding: 14, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>True Negative (TN)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>{cm.true_negative}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tnPct}% of patients (Healthy Confirmed)</div>
            </div>
          </div>
        </div>
      </div>

      {/* PILLAR 2 & 3: Drift & Fairness Side by Side */}
      <div className="grid-2">
        {/* PILLAR 2: Biomarker Data Drift */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Pillar 2: Data Drift (Kolmogorov-Smirnov)</h3>
              <p>Top diverging biomarkers vs. Cleveland reference baseline</p>
            </div>
            <StatusBadge status={driftStatus} />
          </div>
          <div className="card-body">
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDrifting} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                  <XAxis type="number" domain={[0, 'dataMax + 0.1']} tick={{ fill: '#5f6b70', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#1f2a30', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#f6f2e9', borderColor: '#cdc6b5', borderRadius: 2 }}
                    formatter={(val) => [val.toFixed(3), 'Drift Score (KS/PSI)']}
                  />
                  <Bar dataKey="score">
                    {topDrifting.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ marginTop: 12, fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              Primary continuous biomarkers monitored: <strong>Age, Resting Blood Pressure (`trestbps`), Cholesterol (`chol`), Maximum Heart Rate (`thalach`)</strong>.
            </div>
          </div>
        </div>

        {/* PILLAR 3: Demographic Fairness */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Pillar 3: Demographic Fairness & Equity</h3>
              <p>Subgroup Recall & False Negative disparity auditing</p>
            </div>
            <StatusBadge status={fairnessStatus} />
          </div>
          <div className="card-body">
            {fairness?.audits ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {fairness.audits.map((audit, idx) => (
                  <div key={idx} style={{
                    padding: 12,
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{audit.attribute_type}</strong>
                      <StatusBadge status={audit.status} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      {audit.subgroups.map((sub, sIdx) => (
                        <div key={sIdx}>
                          <span style={{ color: 'var(--text-muted)' }}>{sub.group}: </span>
                          <strong style={{ color: 'var(--text-primary)' }}>Recall {(sub.recall * 100).toFixed(1)}%</strong>
                          <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>(FNR {(sub.fnr * 100).toFixed(1)}%)</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                      Disparity Gap: <strong>{audit.gap_percentage_points} percentage points</strong> ({audit.observation})
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No ground-truth target available for fairness audit.</p>
            )}
          </div>
        </div>
      </div>

      {/* Ready for Tableau Export Callout */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)'
      }}>
        <div>
          <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>Analysis Complete & Ready for Tableau</strong>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            All patient predictions, KS drift stats, and fairness metrics are packaged for visualization in Tableau.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={onNavigateToExport}
        >
          Download Tableau CSVs →
        </button>
      </div>
    </div>
  );
}
