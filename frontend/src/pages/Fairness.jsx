import React, { useState } from 'react';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import {
  Scale,
  Users,
  AlertTriangle,
  Info,
  CheckCircle2,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function Fairness({ analysis }) {
  if (!analysis) return null;
  const { fairness } = analysis;

  if (!fairness || fairness.has_fairness_analysis === false) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <HelpCircle size={40} color="var(--accent-cyan)" style={{ margin: '0 auto 16px' }} />
        <h3>Subgroup Fairness Evaluation Unavailable</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '8px auto' }}>
          Ground-truth outcomes are required to audit demographic sensitivity and false negative rate disparities.
          Upload a labeled dataset or load a sample dataset to view subgroup audits.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('Biological Sex');
  const audits = fairness.audits || [];
  const selectedAudit = audits.find(a => a.attribute_type === activeTab) || audits[0];

  // Prepare chart comparison data
  const chartData = selectedAudit ? selectedAudit.subgroups.map(sub => ({
    name: sub.group,
    Recall: Number((sub.recall * 100).toFixed(1)),
    FNR: Number((sub.fnr * 100).toFixed(1)),
    Accuracy: Number((sub.accuracy * 100).toFixed(1)),
    sample_size: sub.sample_size
  })) : [];

  return (
    <div>
      {/* Objective Clinical Language Banner */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        marginBottom: 24
      }}>
        <Scale size={22} color="var(--accent-indigo)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
            Objective Subgroup Performance Auditing
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
            CardioWatch reports measurable diagnostic disparities across demographic cohorts without subjective bias claims.
            In clinical cardiology, symptom presentation in female patients often differs markedly from standard clinical archetypes (e.g., higher frequency of atypical angina), which can manifest as an elevated <strong>False Negative Rate (FNR)</strong>.
          </p>
        </div>
      </div>

      {/* Fairness Status Strip */}
      <div className="kpi-grid">
        <MetricCard
          label="Overall Fairness Health"
          value={fairness.overall_status}
          subtext="Subgroup parity status"
          icon={Scale}
          status={fairness.overall_status}
        />
        <MetricCard
          label="Peak FNR Disparity Gap"
          value={`${fairness.max_fnr_gap_points}%`}
          subtext="Worst-case subgroup sensitivity gap"
          icon={AlertTriangle}
          status={fairness.max_fnr_gap_points > 12 ? 'Attention' : 'Normal'}
        />
        <MetricCard
          label="Demographic Slices"
          value={audits.length}
          subtext="Biological Sex & Age Bracket"
          icon={Users}
          status="Normal"
        />
        <MetricCard
          label="Equal Opportunity Standard"
          value="Recall Parity"
          subtext="True Positive Rate equality"
          icon={ShieldCheck}
          status="Normal"
        />
      </div>

      {/* Interactive Subgroup Selector Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {audits.map((a) => (
          <button
            key={a.attribute_type}
            className={`btn-secondary ${activeTab === a.attribute_type ? 'active' : ''}`}
            style={{
              padding: '10px 20px',
              fontSize: '0.88rem',
              backgroundColor: activeTab === a.attribute_type ? 'rgba(14, 165, 233, 0.15)' : undefined,
              borderColor: activeTab === a.attribute_type ? 'var(--accent-cyan)' : undefined,
              color: activeTab === a.attribute_type ? '#fff' : undefined
            }}
            onClick={() => setActiveTab(a.attribute_type)}
          >
            <strong>{a.attribute_type}</strong>
            <span style={{ marginLeft: 8, fontSize: '0.75rem', opacity: 0.8 }}>({a.gap_percentage_points}% Gap)</span>
          </button>
        ))}
      </div>

      {/* Grid: Bar Chart & Disparity Metrics */}
      <div className="grid-2">
        {/* Chart Comparison */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>{activeTab}: Sensitivity & Error Rates</h3>
              <p>Recall vs False Negative Rate across cohorts</p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 15 }}>
                  <XAxis dataKey="name" tick={{ fill: '#f1f5f9', fontSize: 12 }} />
                  <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0d131f', borderColor: '#334155', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  <Bar dataKey="Recall" name="Recall / Sensitivity (%)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="FNR" name="False Negative Rate (%)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Accuracy" name="Accuracy (%)" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Cohort Detail Cards */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Audited Subgroup Breakdown</h3>
              <p>Disparity Gap: <strong>{selectedAudit?.gap_percentage_points} percentage points</strong></p>
            </div>
            <StatusBadge status={selectedAudit?.status} />
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {selectedAudit?.subgroups.map((sub, idx) => (
                <div key={idx} style={{
                  padding: 16,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h4 style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 700 }}>Cohort: {sub.group}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Sample Size: <strong>{sub.sample_size}</strong></span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, textAlign: 'center' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 8, borderRadius: 6 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Recall</span>
                      <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10B981' }}>{(sub.recall * 100).toFixed(1)}%</p>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 8, borderRadius: 6 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>FNR</span>
                      <p style={{ fontSize: '1.05rem', fontWeight: 700, color: sub.fnr > 0.20 ? '#EF4444' : '#fff' }}>{(sub.fnr * 100).toFixed(1)}%</p>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 8, borderRadius: 6 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Precision</span>
                      <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38BDF8' }}>{(sub.precision * 100).toFixed(1)}%</p>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 8, borderRadius: 6 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Accuracy</span>
                      <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{(sub.accuracy * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                background: 'rgba(255, 255, 255, 0.02)',
                padding: 12,
                borderRadius: 8
              }}>
                <strong>Monitoring Finding:</strong> {selectedAudit?.observation}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
