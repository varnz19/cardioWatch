import React from 'react';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Scale,
  Users,
  Database,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
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

  // Prepare top 5 drifting features for bar chart
  const topDrifting = (drift?.feature_drift_table || []).slice(0, 5).map(f => ({
    name: f.feature,
    score: f.drift_score,
    status: f.status
  }));

  const getBarColor = (status) => {
    if (status === 'HIGH') return '#EF4444';
    if (status === 'MEDIUM') return '#F59E0B';
    return '#10B981';
  };

  return (
    <div>
      {/* Top Status Alert Banner */}
      <div style={{
        background: driftStatus === 'Attention' || fairnessStatus === 'Attention' 
          ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.12), rgba(18, 26, 43, 0.9))'
          : driftStatus === 'Monitor' || fairnessStatus === 'Monitor'
          ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.12), rgba(18, 26, 43, 0.9))'
          : 'linear-gradient(90deg, rgba(16, 185, 129, 0.12), rgba(18, 26, 43, 0.9))',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {driftStatus === 'Attention' || fairnessStatus === 'Attention' ? (
            <ShieldAlert size={28} color="#EF4444" />
          ) : driftStatus === 'Monitor' || fairnessStatus === 'Monitor' ? (
            <AlertTriangle size={28} color="#F59E0B" />
          ) : (
            <CheckCircle2 size={28} color="#10B981" />
          )}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
              System Operational Status: {driftStatus === 'Attention' || fairnessStatus === 'Attention' ? 'Attention Recommended' : driftStatus === 'Monitor' ? 'Continuous Monitoring Active' : 'Normal / Stabilized'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {drift.summary_message}
            </p>
          </div>
        </div>

        <button className="btn-secondary" onClick={() => onNavigate('simulation')}>
          <span>View 5-Month Trajectory</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Top Row KPI Cards */}
      <div className="kpi-grid">
        <MetricCard
          label="Model Accuracy"
          value={acc}
          subtext="Stratified validation baseline"
          icon={Activity}
          status={hasPerf && performance.accuracy < 0.80 ? 'Attention' : 'Normal'}
        />
        <MetricCard
          label="Recall (Sensitivity)"
          value={rec}
          subtext="Cardiac detection rate"
          icon={TrendingDown}
          status={hasPerf && performance.recall < 0.80 ? 'Attention' : 'Normal'}
        />
        <MetricCard
          label="False Negative Rate"
          value={fnr}
          subtext="Undetected cardiac risk"
          icon={AlertTriangle}
          status={hasPerf && performance.false_negative_rate > 0.15 ? 'Attention' : 'Normal'}
        />
        <MetricCard
          label="Population Drift"
          value={driftStatus}
          subtext={`${drift.high_drift_count} high-drift features`}
          icon={Database}
          status={driftStatus}
        />
        <MetricCard
          label="Max Fairness Disparity"
          value={maxGap}
          subtext="Peak subgroup FNR gap"
          icon={Scale}
          status={fairnessStatus}
        />
      </div>

      {/* Center 2-Column Grid */}
      <div className="grid-2">
        {/* Drift Overview Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Top Drifting Features (KS / PSI)</h3>
              <p>Features diverging most from the baseline reference population</p>
            </div>
            <button className="btn-secondary" onClick={() => onNavigate('drift')}>
              <span>Full Drift Table</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body">
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDrifting} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                  <XAxis type="number" domain={[0, 'dataMax + 0.1']} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#f1f5f9', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0d131f', borderColor: '#334155', borderRadius: 8 }}
                    formatter={(val) => [val.toFixed(3), 'Drift Score']}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
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
              <h3>Demographic Equity & Disparities</h3>
              <p>Recall and False Negative Rate comparisons across cohorts</p>
            </div>
            <button className="btn-secondary" onClick={() => onNavigate('fairness')}>
              <span>Fairness Audit</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body">
            {fairness?.audits ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {fairness.audits.map((audit, idx) => (
                  <div key={idx} style={{
                    padding: 14,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{audit.attribute_type}</strong>
                      <StatusBadge status={audit.status} />
                    </div>
                    <div style={{ display: 'flex', gap: 24, fontSize: '0.82rem' }}>
                      {audit.subgroups.map((sub, sIdx) => (
                        <div key={sIdx}>
                          <span style={{ color: 'var(--text-dim)' }}>{sub.group}: </span>
                          <strong style={{ color: '#fff' }}>Recall {(sub.recall * 100).toFixed(1)}%</strong>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>(FNR {(sub.fnr * 100).toFixed(1)}%)</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
                      Disparity Gap: <strong>{audit.gap_percentage_points} percentage points</strong> ({audit.observation})
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No ground-truth target present for fairness evaluation.</p>
            )}
          </div>
        </div>
      </div>

      {/* Dataset Health Summary Row */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Active Dataset Specifications</h3>
            <p>Dataset: <strong>{analysis.dataset_name}</strong></p>
          </div>
          <button className="btn-secondary" onClick={() => onNavigate('dataset')}>
            <span>Inspect Data Table</span>
            <ArrowRight size={13} />
          </button>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Evaluated Rows</span>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{metadata.total_rows}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Clinical Features</span>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{metadata.total_columns}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Missing Values</span>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{metadata.missing_cells}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Duplicate Rows</span>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{metadata.duplicate_rows}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Target Status</span>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--status-normal)' }}>Supervised Ground Truth</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
