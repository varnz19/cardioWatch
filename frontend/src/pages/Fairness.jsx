import React, { useState } from 'react';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function Fairness({ analysis }) {
  if (!analysis) return null;
  const { fairness } = analysis;

  if (!fairness || fairness.has_fairness_analysis === false) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <h3>Subgroup Fairness Evaluation Unavailable</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 500, margin: '8px auto', fontSize: '0.8rem' }}>
          Ground-truth target column absent. Ingest a labeled dataset or select a sample cohort to audit demographic sensitivity.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('Biological Sex');
  const audits = fairness.audits || [];
  const selectedAudit = audits.find(a => a.attribute_type === activeTab) || audits[0];

  const chartData = selectedAudit ? selectedAudit.subgroups.map(sub => ({
    name: sub.group,
    Recall: Number((sub.recall * 100).toFixed(1)),
    FNR: Number((sub.fnr * 100).toFixed(1)),
    Accuracy: Number((sub.accuracy * 100).toFixed(1)),
    sample_size: sub.sample_size
  })) : [];

  return (
    <div>
      {/* Policy Notice */}
      <div className="notice-box" style={{ marginTop: 0, marginBottom: 20 }}>
        <strong>Subgroup Disparity Auditing:</strong> Performance metrics are audited across cohorts to verify sensitivity consistency. Measurable differences in diagnostic recall or false-negative rates reflect potential presentation shifts without subjective bias claims.
      </div>

      {/* Fairness Status Strip */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <MetricCard
          label="Fairness Status"
          value={fairness.overall_status}
          subtext="Subgroup parity status"
          status={fairness.overall_status}
        />
        <MetricCard
          label="Peak FNR Disparity Gap"
          value={`${fairness.max_fnr_gap_points}%`}
          subtext="Subgroup sensitivity divergence"
          status={fairness.max_fnr_gap_points > 12 ? 'Attention' : 'Normal'}
        />
        <MetricCard
          label="Demographic Slices"
          value={audits.length}
          subtext="Sex &amp; Age Brackets"
          status="Normal"
        />
        <MetricCard
          label="Parity Standard"
          value="Recall Parity"
          subtext="Equal Opportunity Metric"
          status="Normal"
        />
      </div>

      {/* Selector Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {audits.map((a) => (
          <button
            key={a.attribute_type}
            className={`btn-secondary ${activeTab === a.attribute_type ? 'active' : ''}`}
            style={{
              backgroundColor: activeTab === a.attribute_type ? 'var(--bg-subtle)' : undefined,
              borderColor: activeTab === a.attribute_type ? 'var(--border-focus)' : undefined
            }}
            onClick={() => setActiveTab(a.attribute_type)}
          >
            {a.attribute_type} ({a.gap_percentage_points}% Gap)
          </button>
        ))}
      </div>

      {/* Grid: Bar Chart & Disparity Metrics */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>{activeTab}: Sensitivity and Error Comparison</h3>
              <p>Recall versus False Negative Rate across cohorts</p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <XAxis dataKey="name" tick={{ fill: '#e6edf3', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: 2 }} />
                  <Legend />
                  <Bar dataKey="Recall" name="Recall / Sensitivity (%)" fill="#238636" />
                  <Bar dataKey="FNR" name="False Negative Rate (%)" fill="#da3633" />
                  <Bar dataKey="Accuracy" name="Accuracy (%)" fill="#1f6feb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Audited Subgroup Breakdown</h3>
              <p>Disparity Gap: {selectedAudit?.gap_percentage_points} percentage points</p>
            </div>
            <StatusBadge status={selectedAudit?.status} />
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedAudit?.subgroups.map((sub, idx) => (
                <div key={idx} style={{
                  padding: 10,
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sharp)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>Cohort: {sub.group}</h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sample: {sub.sample_size}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recall</span>
                      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--state-normal-text)' }}>{(sub.recall * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>FNR</span>
                      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: sub.fnr > 0.20 ? 'var(--state-attention-text)' : 'inherit' }}>{(sub.fnr * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precision</span>
                      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#388bfd' }}>{(sub.precision * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accuracy</span>
                      <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>{(sub.accuracy * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                padding: '8px 10px',
                border: '1px solid var(--border-muted)'
              }}>
                Observation: {selectedAudit?.observation}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
