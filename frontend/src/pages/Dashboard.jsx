import React from 'react';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function Dashboard({ analysis, onNavigate }) {
  if (!analysis) return null;

  const { metadata, performance, drift, fairness } = analysis;

  const hasPerf = performance && performance.has_performance !== false;
  const acc = hasPerf ? `${(performance.accuracy * 100).toFixed(1)}%` : 'N/A';
  const rec = hasPerf ? `${(performance.recall * 100).toFixed(1)}%` : 'N/A';
  const f1 = hasPerf ? `${(performance.f1_score * 100).toFixed(1)}%` : 'N/A';
  const fnr = hasPerf ? `${(performance.false_negative_rate * 100).toFixed(1)}%` : 'N/A';

  const driftStatus = drift ? drift.overall_status : 'Normal';
  const maxGap = fairness && fairness.has_fairness_analysis ? `${fairness.max_fnr_gap_points}%` : 'N/A';
  const fairnessStatus = fairness ? fairness.overall_status : 'Normal';

  // Top drifting features
  const topDrifting = (drift?.feature_drift_table || []).slice(0, 5).map(f => ({
    name: f.feature,
    score: f.drift_score,
    status: f.status
  }));

  const getBarColor = (status) => {
    if (status === 'HIGH') return '#da3633';
    if (status === 'MEDIUM') return '#9e6a03';
    return '#238636';
  };

  return (
    <div>
      {/* Top Status Alert Banner */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sharp)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
              System Operational Status:
            </span>
            <StatusBadge status={driftStatus === 'Attention' || fairnessStatus === 'Attention' ? 'Attention' : driftStatus === 'Monitor' ? 'Monitor' : 'Normal'} />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {drift.summary_message}
          </p>
        </div>

        <button className="btn-secondary" onClick={() => onNavigate('simulation')}>
          View 5-Month Trajectory
        </button>
      </div>

      {/* 3 Core Pillar Surveillance Indicators */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <MetricCard
          label="Model Performance"
          value={acc}
          subtext={`Accuracy baseline (${rec} sensitivity, ${fnr} FNR)`}
          status={hasPerf && performance.accuracy < 0.80 ? 'Attention' : 'Normal'}
        />
        <MetricCard
          label="Population Drift"
          value={driftStatus}
          subtext={`${drift.high_drift_count} high-drift features (KS / PSI)`}
          status={driftStatus}
        />
        <MetricCard
          label="Peak Fairness Gap"
          value={maxGap}
          subtext="Subgroup FNR disparity (Sex & Age)"
          status={fairnessStatus}
        />
      </div>

      {/* 2-Column Grid */}
      <div className="grid-2">
        {/* Drift Overview */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Top Drifting Features (KS / PSI)</h3>
              <p>Biomarkers diverging most from baseline reference</p>
            </div>
            <button className="btn-secondary" onClick={() => onNavigate('drift')}>
              Drift Table
            </button>
          </div>
          <div className="card-body">
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDrifting} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                  <XAxis type="number" domain={[0, 'dataMax + 0.1']} tick={{ fill: '#8b949e', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#e6edf3', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: 2 }}
                    formatter={(val) => [val.toFixed(3), 'Drift Score']}
                  />
                  <Bar dataKey="score">
                    {topDrifting.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Demographic Fairness Summary */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Demographic Equity Audits</h3>
              <p>Recall and False Negative Rate comparisons across cohorts</p>
            </div>
            <button className="btn-secondary" onClick={() => onNavigate('fairness')}>
              Fairness Audit
            </button>
          </div>
          <div className="card-body">
            {fairness?.audits ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {fairness.audits.map((audit, idx) => (
                  <div key={idx} style={{
                    padding: 10,
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sharp)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{audit.attribute_type}</strong>
                      <StatusBadge status={audit.status} />
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem' }}>
                      {audit.subgroups.map((sub, sIdx) => (
                        <div key={sIdx}>
                          <span style={{ color: 'var(--text-muted)' }}>{sub.group}: </span>
                          <strong style={{ color: 'var(--text-primary)' }}>Recall {(sub.recall * 100).toFixed(1)}%</strong>
                          <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>(FNR {(sub.fnr * 100).toFixed(1)}%)</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                      Disparity Gap: {audit.gap_percentage_points} percentage points ({audit.observation})
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No ground-truth target available for fairness audit.</p>
            )}
          </div>
        </div>
      </div>

      {/* Dataset Specifications Row */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Active Dataset Specifications</h3>
            <p>Dataset: {analysis.dataset_name}</p>
          </div>
          <button className="btn-secondary" onClick={() => onNavigate('dataset')}>
            Data Table
          </button>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Evaluated Rows</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metadata.total_rows}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clinical Features</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metadata.total_columns}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Missing Values</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metadata.missing_cells}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duplicate Rows</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metadata.duplicate_rows}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Supervision Target</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--state-normal-text)' }}>Ground Truth Present</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
