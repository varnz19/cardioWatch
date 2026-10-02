import React from 'react';
import {
  FileSpreadsheet,
  Download,
  CheckCircle,
  Database,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { getExportDownloadUrl } from '../services/api';

export default function Export() {
  const exports = [
    {
      id: 'performance',
      title: 'Model Performance KPIs',
      filename: 'monthly_performance_kpis.csv',
      description: 'Monthly longitudinal accuracy, precision, recall, F1-score, ROC-AUC, FPR, and FNR.',
      columns: ['period', 'accuracy', 'precision', 'recall', 'f1', 'roc_auc', 'false_positive_rate', 'false_negative_rate'],
      tag: 'Dashboard 1'
    },
    {
      id: 'drift',
      title: 'Feature Drift Metrics (KS-Test / PSI)',
      filename: 'feature_drift_metrics.csv',
      description: 'Feature-level Kolmogorov-Smirnov statistics, PSI scores, p-values, and drift statuses.',
      columns: ['period', 'feature', 'drift_method', 'drift_score', 'p_value', 'status'],
      tag: 'Dashboard 2'
    },
    {
      id: 'fairness',
      title: 'Subgroup Clinical Fairness Audit',
      filename: 'subgroup_fairness_audit.csv',
      description: 'Demographic slicing by Sex and Age, tracking recall disparities and false-negative rate gaps.',
      columns: ['period', 'group_type', 'group', 'accuracy', 'precision', 'recall', 'fnr', 'fpr', 'gap'],
      tag: 'Dashboard 3'
    },
    {
      id: 'patients',
      title: 'Granular Longitudinal Patient Telemetry',
      filename: 'patient_records_longitudinal.csv',
      description: '1,300+ individual patient evaluations with true/predicted labels, probability scores, and error types.',
      columns: ['patient_id', 'period', 'age', 'sex', 'prediction', 'probability', 'actual', 'correct', 'error_type'],
      tag: 'Dashboards 1 & 4'
    }
  ];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Introduction Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title-group">
            <h3>Tableau Data Exchange Hub</h3>
            <p>Export pre-calculated machine learning, drift, and fairness tables into Tableau</p>
          </div>
          <span className="status-badge normal">
            <span className="badge-dot" /> Clean Relational Schema
          </span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            In production systems, <strong>Tableau serves as the visualization and business intelligence layer</strong>,
            not the ML computation engine. All statistical tests (Two-Sample KS, PSI, matrix algebra, and demographic slicing)
            have been processed by Python and formatted into clean, tidy CSV tables.
          </p>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {exports.map((item) => (
          <div key={item.id} className="card" style={{ marginBottom: 0 }}>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileSpreadsheet size={18} color="var(--accent-cyan)" />
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{item.title}</h4>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'rgba(14, 165, 233, 0.1)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                    {item.tag}
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  {item.description}
                </p>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Table Schema ({item.columns.length} columns):
                  </span>
                  <code style={{ fontSize: '0.72rem', color: '#94a3b8', wordBreak: 'break-all' }}>
                    {item.columns.join(' • ')}
                  </code>
                </div>
              </div>

              <a
                href={getExportDownloadUrl(item.id)}
                download={item.filename}
                className="btn-primary"
                style={{ textDecoration: 'none', justifyContent: 'center', padding: '10px' }}
              >
                <Download size={15} />
                <span>Download {item.filename}</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Tableau Quick Reference Guide */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Tableau Visual Modeling Guide</h3>
            <p>Connect these four CSVs to build the 4 CardioWatch dashboards</p>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <strong style={{ fontSize: '0.85rem', color: '#fff' }}>Dashboard 1</strong>
              <p style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', margin: '4px 0' }}>Model Performance</p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                KPI cards, Accuracy & FNR trendlines, Confusion Matrix heatmap, and ROC curves.
              </span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <strong style={{ fontSize: '0.85rem', color: '#fff' }}>Dashboard 2</strong>
              <p style={{ fontSize: '0.75rem', color: '#F59E0B', margin: '4px 0' }}>Data Drift</p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Feature drift heatmap matrix (KS/PSI), population distribution histograms, and risk flags.
              </span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <strong style={{ fontSize: '0.85rem', color: '#fff' }}>Dashboard 3</strong>
              <p style={{ fontSize: '0.75rem', color: '#6366F1', margin: '4px 0' }}>Fairness Audit</p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Subgroup dumbbell plots for Recall, False Negative Rate by Sex/Age, and Equal Opportunity gaps.
              </span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <strong style={{ fontSize: '0.85rem', color: '#fff' }}>Dashboard 4</strong>
              <p style={{ fontSize: '0.75rem', color: '#10B981', margin: '4px 0' }}>Surveillance Hub</p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Executive single-pane-of-glass overview combining system health, drift alerts, and performance trends.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
