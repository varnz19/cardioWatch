import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import {
  GitCommit,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Info,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function Drift({ analysis }) {
  if (!analysis || !analysis.drift) return null;
  const { drift } = analysis;

  const features = drift.feature_drift_table || [];
  const [selectedFeature, setSelectedFeature] = useState(features[0]?.feature || 'trestbps');

  const selectedDist = drift.distributions?.[selectedFeature] || [];

  return (
    <div>
      {/* Educational Concept Distinction Banner */}
      <div style={{
        background: 'rgba(14, 165, 233, 0.08)',
        border: '1px solid rgba(14, 165, 233, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        marginBottom: 24
      }}>
        <Info size={22} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
            Data/Covariate Drift vs. Model Performance Decay
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
            <strong>Data Drift:</strong> Quantifies statistical changes in patient physiological distributions ($P(X)$) compared to the baseline training population.
            Continuous features are audited using the <strong>Two-Sample Kolmogorov-Smirnov (KS) Test</strong> (D = sup |F_curr(x) - F_ref(x)|), and categorical features via the <strong>Population Stability Index (PSI)</strong>.
          </p>
        </div>
      </div>

      {/* Drift Status KPIs */}
      <div className="kpi-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Overall Population Health</span>
            <StatusBadge status={drift.overall_status} />
          </div>
          <div className="metric-value">{drift.overall_status}</div>
          <div className="metric-subtext">{drift.summary_message}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">High Drift Features</span>
            <div className="metric-icon-box" style={{ color: '#EF4444' }}><AlertTriangle size={16} /></div>
          </div>
          <div className="metric-value" style={{ color: drift.high_drift_count > 0 ? '#EF4444' : '#fff' }}>
            {drift.high_drift_count}
          </div>
          <div className="metric-subtext">KS ≥ 0.20 or PSI ≥ 0.25</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Moderate Drift Features</span>
            <div className="metric-icon-box" style={{ color: '#F59E0B' }}><TrendingUp size={16} /></div>
          </div>
          <div className="metric-value" style={{ color: drift.medium_drift_count > 0 ? '#F59E0B' : '#fff' }}>
            {drift.medium_drift_count}
          </div>
          <div className="metric-subtext">0.10 ≤ KS &lt; 0.20</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Biomarkers Tested</span>
            <div className="metric-icon-box"><Layers size={16} /></div>
          </div>
          <div className="metric-value">{drift.features_analyzed_count}</div>
          <div className="metric-subtext">Continuous & categorical</div>
        </div>
      </div>

      {/* Feature Distribution Interactive Comparison */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Reference vs. Uploaded Cohort Distribution Comparison</h3>
            <p>Select any clinical biomarker to visualize population shifts across frequency bins</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selected Feature:</span>
            <select
              className="form-control"
              style={{ padding: '6px 12px', fontSize: '0.85rem', width: 170 }}
              value={selectedFeature}
              onChange={(e) => setSelectedFeature(e.target.value)}
            >
              {features.map((f) => (
                <option key={f.feature} value={f.feature}>
                  {f.feature} ({f.status})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="card-body">
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectedDist} margin={{ top: 15, right: 20, left: 10, bottom: 15 }}>
                <XAxis dataKey="bin_label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis label={{ value: 'Cohort Proportion (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0d131f', borderColor: '#334155', borderRadius: 8 }} />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar dataKey="reference_pct" name="Reference Baseline Cohort (%)" fill="#0284C7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="current_pct" name="Uploaded Current Cohort (%)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Complete Feature Drift Scorecard Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Complete Feature Drift Scorecard</h3>
            <p>Statistical hypothesis testing against historical baseline</p>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Type</th>
                  <th>Method</th>
                  <th>Drift Score</th>
                  <th>P-Value</th>
                  <th>Ref Mean</th>
                  <th>Current Mean</th>
                  <th>Delta</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {features.map((item, i) => (
                  <tr key={i}>
                    <td><strong>{item.feature}</strong></td>
                    <td style={{ color: 'var(--text-dim)' }}>{item.feature_type}</td>
                    <td><code style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>{item.drift_method}</code></td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: item.status === 'HIGH' ? '#EF4444' : item.status === 'MEDIUM' ? '#F59E0B' : '#10B981'
                      }}>
                        {item.drift_score.toFixed(4)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.p_value}</td>
                    <td>{item.reference_mean}</td>
                    <td>{item.current_mean}</td>
                    <td style={{ color: item.mean_difference > 0 ? '#F59E0B' : item.mean_difference < 0 ? '#38BDF8' : 'var(--text-dim)' }}>
                      {item.mean_difference > 0 ? `+${item.mean_difference}` : item.mean_difference}
                    </td>
                    <td>
                      <StatusBadge status={item.status} label={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
