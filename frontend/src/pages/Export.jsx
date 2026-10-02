import React from 'react';
import { getExportDownloadUrl } from '../services/api';

export default function Export() {
  const exports = [
    {
      id: 'performance',
      title: 'Model Performance KPIs',
      filename: 'monthly_performance_kpis.csv',
      description: 'Monthly accuracy, precision, recall, F1-score, ROC-AUC, FPR, and FNR.',
      columns: ['period', 'accuracy', 'precision', 'recall', 'f1', 'roc_auc', 'false_positive_rate', 'false_negative_rate'],
      tag: 'Dashboard 1'
    },
    {
      id: 'drift',
      title: 'Feature Drift Metrics (KS-Test / PSI)',
      filename: 'feature_drift_metrics.csv',
      description: 'Feature-level Kolmogorov-Smirnov statistics, PSI scores, p-values, and statuses.',
      columns: ['period', 'feature', 'drift_method', 'drift_score', 'p_value', 'status'],
      tag: 'Dashboard 2'
    },
    {
      id: 'fairness',
      title: 'Subgroup Clinical Fairness Audit',
      filename: 'subgroup_fairness_audit.csv',
      description: 'Demographic slicing by Sex and Age, tracking recall disparities and FNR gaps.',
      columns: ['period', 'group_type', 'group', 'accuracy', 'precision', 'recall', 'fnr', 'fpr', 'gap'],
      tag: 'Dashboard 3'
    },
    {
      id: 'patients',
      title: 'Longitudinal Patient Telemetry',
      filename: 'patient_records_longitudinal.csv',
      description: '1,300+ patient records with true/predicted outcomes, probabilities, and error types.',
      columns: ['patient_id', 'period', 'age', 'sex', 'prediction', 'probability', 'actual', 'correct', 'error_type'],
      tag: 'Dashboard 4'
    }
  ];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Tableau Data Exchange Hub</h3>
            <p>Export pre-calculated machine learning, drift, and fairness tables into Tableau</p>
          </div>
          <span className="status-badge normal">Relational Schema</span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            In production systems, Tableau serves as the visual presentation layer. All statistical evaluations (Two-Sample KS, PSI, matrix algebra, and demographic slicing) are executed by the Python engine and formatted into normalized CSV tables.
          </p>
        </div>
      </div>

      {/* Export Cards Grid (2x2) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {exports.map((item) => (
          <div key={item.id} className="card" style={{ marginBottom: 0 }}>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</h4>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', padding: '1px 6px' }}>
                    {item.tag}
                  </span>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  {item.description}
                </p>

                <div style={{ background: 'var(--bg-subtle)', padding: '8px 10px', marginBottom: 14 }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                    Columns ({item.columns.length}):
                  </span>
                  <code style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {item.columns.join(', ')}
                  </code>
                </div>
              </div>

              <a
                href={getExportDownloadUrl(item.id)}
                download={item.filename}
                className="btn-primary"
                style={{ textDecoration: 'none', textAlign: 'center', padding: '8px' }}
              >
                Download {item.filename}
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Tableau Visual Modeling Guide (4 items) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Tableau Visual Modeling Guide</h3>
            <p>Connect these four CSVs to construct the 4 CardioWatch dashboards</p>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div style={{ background: 'var(--bg-subtle)', padding: 10, border: '1px solid var(--border-default)' }}>
              <strong style={{ fontSize: '0.8rem' }}>Dashboard 1</strong>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '2px 0' }}>Model Performance</p>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                KPI cards, Accuracy &amp; FNR trendlines, Confusion Matrix heatmap, ROC curves.
              </span>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: 10, border: '1px solid var(--border-default)' }}>
              <strong style={{ fontSize: '0.8rem' }}>Dashboard 2</strong>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '2px 0' }}>Data Drift</p>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Feature drift heatmap matrix (KS/PSI), population distribution histograms.
              </span>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: 10, border: '1px solid var(--border-default)' }}>
              <strong style={{ fontSize: '0.8rem' }}>Dashboard 3</strong>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '2px 0' }}>Fairness Audit</p>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Subgroup dumbbell plots for Recall, False Negative Rate by Sex/Age.
              </span>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: 10, border: '1px solid var(--border-default)' }}>
              <strong style={{ fontSize: '0.8rem' }}>Dashboard 4</strong>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '2px 0' }}>Surveillance Hub</p>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Executive overview combining system health, drift alerts, and performance trends.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
