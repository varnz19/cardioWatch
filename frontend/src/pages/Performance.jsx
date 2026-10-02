import React from 'react';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  HelpCircle
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

export default function Performance({ analysis }) {
  if (!analysis) return null;
  const { performance, feature_importance } = analysis;

  if (!performance || performance.has_performance === false) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <HelpCircle size={40} color="var(--accent-cyan)" style={{ margin: '0 auto 16px' }} />
        <h3>Supervised Performance Metrics Unavailable</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '8px auto' }}>
          The uploaded dataset does not contain a ground-truth <code>target</code> column.
          Upload a labeled dataset or load a sample dataset to view accuracy, sensitivity, and confusion matrix.
        </p>
      </div>
    );
  }

  const {
    accuracy, precision, recall, f1_score, roc_auc, brier_score,
    false_positive_rate, false_negative_rate, confusion_matrix, roc_curve, pr_curve
  } = performance;

  const cmTotal = confusion_matrix.total || 1;
  const tpPct = ((confusion_matrix.true_positive / cmTotal) * 100).toFixed(1);
  const tnPct = ((confusion_matrix.true_negative / cmTotal) * 100).toFixed(1);
  const fpPct = ((confusion_matrix.false_positive / cmTotal) * 100).toFixed(1);
  const fnPct = ((confusion_matrix.false_negative / cmTotal) * 100).toFixed(1);

  return (
    <div>
      {/* Top Metric Strip */}
      <div className="kpi-grid">
        <MetricCard
          label="Model Accuracy"
          value={`${(accuracy * 100).toFixed(1)}%`}
          subtext="Correct predictions / total"
          icon={Activity}
          status={accuracy >= 0.80 ? 'Normal' : 'Attention'}
        />
        <MetricCard
          label="Sensitivity (Recall)"
          value={`${(recall * 100).toFixed(1)}%`}
          subtext="True positive detection"
          icon={CheckCircle2}
          status={recall >= 0.80 ? 'Normal' : 'Attention'}
        />
        <MetricCard
          label="Precision (PPV)"
          value={`${(precision * 100).toFixed(1)}%`}
          subtext="Positive predictive value"
          icon={Award}
          status="Normal"
        />
        <MetricCard
          label="F1 Score"
          value={f1_score.toFixed(3)}
          subtext="Harmonic mean of P & R"
          icon={Layers}
          status="Normal"
        />
        <MetricCard
          label="ROC-AUC"
          value={roc_auc.toFixed(3)}
          subtext="Discriminative power"
          icon={Activity}
          status={roc_auc >= 0.85 ? 'Normal' : 'Monitor'}
        />
        <MetricCard
          label="False Negative Rate"
          value={`${(false_negative_rate * 100).toFixed(1)}%`}
          subtext="Clinical missed cases"
          icon={AlertTriangle}
          status={false_negative_rate > 0.15 ? 'Attention' : 'Normal'}
        />
      </div>

      {/* Grid: Confusion Matrix & ROC Curve */}
      <div className="grid-2">
        {/* Confusion Matrix Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Normalized Clinical Confusion Matrix</h3>
              <p>Breakdown of diagnostic predictions vs ground-truth clinical outcomes</p>
            </div>
            <StatusBadge status={false_negative_rate > 0.15 ? 'Attention' : 'Normal'} label={`FNR: ${(false_negative_rate * 100).toFixed(1)}%`} />
          </div>
          <div className="card-body">
            <div className="cm-container">
              {/* True Positive */}
              <div className="cm-cell positive-cell">
                <div className="cm-cell-label">True Positive (TP)</div>
                <div className="cm-cell-val" style={{ color: '#38BDF8' }}>{confusion_matrix.true_positive}</div>
                <div className="cm-cell-pct">{tpPct}% of cohort</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>Cardiac disease detected</div>
              </div>

              {/* False Positive */}
              <div className="cm-cell error-cell">
                <div className="cm-cell-label">False Positive (FP)</div>
                <div className="cm-cell-val" style={{ color: '#F59E0B' }}>{confusion_matrix.false_positive}</div>
                <div className="cm-cell-pct">{fpPct}% of cohort</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>Unnecessary follow-up</div>
              </div>

              {/* False Negative */}
              <div className="cm-cell error-cell" style={{ border: '2px solid rgba(239, 68, 68, 0.4)' }}>
                <div className="cm-cell-label" style={{ color: '#F87171' }}>False Negative (FN)</div>
                <div className="cm-cell-val" style={{ color: '#EF4444' }}>{confusion_matrix.false_negative}</div>
                <div className="cm-cell-pct">{fnPct}% of cohort</div>
                <div style={{ fontSize: '0.72rem', color: '#F87171', marginTop: 4, fontWeight: 600 }}>Missed cardiac risk</div>
              </div>

              {/* True Negative */}
              <div className="cm-cell positive-cell">
                <div className="cm-cell-label">True Negative (TN)</div>
                <div className="cm-cell-val" style={{ color: '#10B981' }}>{confusion_matrix.true_negative}</div>
                <div className="cm-cell-pct">{tnPct}% of cohort</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>Healthy confirmed</div>
              </div>
            </div>

            <div style={{ marginTop: 20, fontSize: '0.78rem', color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5 }}>
              *In cardiovascular screening, <strong>False Negatives</strong> carry the highest clinical harm index: patients with active cardiac ischemia sent home without intervention.
            </div>
          </div>
        </div>

        {/* ROC Curve Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Receiver Operating Characteristic (ROC)</h3>
              <p>Area Under Curve (AUC): <strong>{roc_auc.toFixed(3)}</strong> | Brier Score: <strong>{brier_score.toFixed(3)}</strong></p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={roc_curve} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <XAxis dataKey="fpr" label={{ value: 'False Positive Rate (1 - Specificity)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis label={{ value: 'True Positive Rate (Recall)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 1]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0d131f', borderColor: '#334155', borderRadius: 8 }} />
                  <ReferenceLine stroke="#475569" strokeDasharray="3 3" segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} />
                  <Line type="monotone" dataKey="tpr" stroke="#0EA5E9" strokeWidth={3} dot={false} />
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
            <p>Relative Gini-impurity reduction of each clinical biomarker in predicting cardiac risk</p>
          </div>
        </div>
        <div className="card-body">
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feature_importance} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <XAxis dataKey="feature" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Importance Share (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d131f', borderColor: '#334155', borderRadius: 8 }}
                  formatter={(val) => [`${val}%`, 'Predictive Influence']}
                />
                <Bar dataKey="percentage" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
