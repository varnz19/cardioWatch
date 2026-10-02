import React from 'react';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

export default function Performance({ analysis }) {
  if (!analysis) return null;
  const { performance, feature_importance } = analysis;

  if (!performance || performance.has_performance === false) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <h3>Supervised Performance Evaluation Unavailable</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 500, margin: '8px auto', fontSize: '0.8rem' }}>
          Ground-truth target column absent. Ingest a labeled dataset or select a sample cohort to view classification matrices.
        </p>
      </div>
    );
  }

  const {
    accuracy, precision, recall, f1_score, roc_auc, brier_score,
    false_positive_rate, false_negative_rate, confusion_matrix, roc_curve
  } = performance;

  const cmTotal = confusion_matrix.total || 1;
  const tpPct = ((confusion_matrix.true_positive / cmTotal) * 100).toFixed(1);
  const tnPct = ((confusion_matrix.true_negative / cmTotal) * 100).toFixed(1);
  const fpPct = ((confusion_matrix.false_positive / cmTotal) * 100).toFixed(1);
  const fnPct = ((confusion_matrix.false_negative / cmTotal) * 100).toFixed(1);

  return (
    <div>
      {/* Metrics Strip */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        <MetricCard
          label="Model Accuracy"
          value={`${(accuracy * 100).toFixed(1)}%`}
          subtext="Total accuracy"
          status={accuracy >= 0.80 ? 'Normal' : 'Attention'}
        />
        <MetricCard
          label="Sensitivity (Recall)"
          value={`${(recall * 100).toFixed(1)}%`}
          subtext="Detection rate"
          status={recall >= 0.80 ? 'Normal' : 'Attention'}
        />
        <MetricCard
          label="Precision (PPV)"
          value={`${(precision * 100).toFixed(1)}%`}
          subtext="True positive precision"
          status="Normal"
        />
        <MetricCard
          label="F1 Score"
          value={f1_score.toFixed(3)}
          subtext="Harmonic mean"
          status="Normal"
        />
        <MetricCard
          label="ROC-AUC"
          value={roc_auc.toFixed(3)}
          subtext="Discrimination index"
          status={roc_auc >= 0.85 ? 'Normal' : 'Monitor'}
        />
        <MetricCard
          label="False Negative Rate"
          value={`${(false_negative_rate * 100).toFixed(1)}%`}
          subtext="Clinical missed rate"
          status={false_negative_rate > 0.15 ? 'Attention' : 'Normal'}
        />
      </div>

      {/* Grid: Confusion Matrix & ROC Curve */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Normalized Clinical Confusion Matrix</h3>
              <p>Predicted classification versus ground-truth outcomes</p>
            </div>
            <StatusBadge status={false_negative_rate > 0.15 ? 'Attention' : 'Normal'} label={`FNR: ${(false_negative_rate * 100).toFixed(1)}%`} />
          </div>
          <div className="card-body">
            <div className="cm-container">
              <div className="cm-cell">
                <div className="cm-cell-label">True Positive (TP)</div>
                <div className="cm-cell-val">{confusion_matrix.true_positive}</div>
                <div className="cm-cell-pct">{tpPct}% of cohort</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Cardiac condition detected</div>
              </div>

              <div className="cm-cell">
                <div className="cm-cell-label">False Positive (FP)</div>
                <div className="cm-cell-val" style={{ color: 'var(--state-monitor-text)' }}>{confusion_matrix.false_positive}</div>
                <div className="cm-cell-pct">{fpPct}% of cohort</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Unnecessary testing</div>
              </div>

              <div className="cm-cell" style={{ borderColor: 'var(--state-attention)' }}>
                <div className="cm-cell-label" style={{ color: 'var(--state-attention-text)' }}>False Negative (FN)</div>
                <div className="cm-cell-val" style={{ color: 'var(--state-attention-text)' }}>{confusion_matrix.false_negative}</div>
                <div className="cm-cell-pct">{fnPct}% of cohort</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--state-attention-text)', marginTop: 4 }}>Undetected cardiac risk</div>
              </div>

              <div className="cm-cell">
                <div className="cm-cell-label">True Negative (TN)</div>
                <div className="cm-cell-val">{confusion_matrix.true_negative}</div>
                <div className="cm-cell-pct">{tnPct}% of cohort</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Healthy confirmed</div>
              </div>
            </div>

            <div className="notice-box" style={{ marginTop: 14 }}>
              False Negatives represent patients with active cardiac risk who receive negative predictions. Clinical workflows mandate minimizing FNR to prevent missed triage.
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Receiver Operating Characteristic (ROC)</h3>
              <p>AUC: {roc_auc.toFixed(3)} | Brier Score: {brier_score.toFixed(3)}</p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={roc_curve} margin={{ top: 10, right: 10, left: 0, bottom: 15 }}>
                  <XAxis dataKey="fpr" tick={{ fill: '#8b949e', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} domain={[0, 1]} />
                  <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: 2 }} />
                  <ReferenceLine stroke="#484f58" strokeDasharray="3 3" segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} />
                  <Line type="monotone" dataKey="tpr" stroke="#1f6feb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Importance Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Random Forest Feature Importance</h3>
            <p>Gini impurity reduction share across clinical predictors</p>
          </div>
        </div>
        <div className="card-body">
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feature_importance} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <XAxis dataKey="feature" tick={{ fill: '#8b949e', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: 2 }}
                  formatter={(val) => [`${val}%`, 'Predictive Share']}
                />
                <Bar dataKey="percentage" fill="#1f6feb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
