import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
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
      {/* Notice Banner */}
      <div className="notice-box" style={{ marginTop: 0, marginBottom: 20 }}>
        <strong>Data Drift vs Model Decay:</strong> Data drift denotes statistical divergence in patient biomarker distributions (P(X)) relative to the baseline training population. Continuous features are audited via the Two-Sample Kolmogorov-Smirnov (KS) test, and categorical features via the Population Stability Index (PSI).
      </div>

      {/* Drift Status KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Population Health</span>
            <StatusBadge status={drift.overall_status} />
          </div>
          <div className="metric-value">{drift.overall_status}</div>
          <div className="metric-subtext">{drift.summary_message}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">High Drift Features</span>
          </div>
          <div className="metric-value" style={{ color: drift.high_drift_count > 0 ? 'var(--state-attention-text)' : 'inherit' }}>
            {drift.high_drift_count}
          </div>
          <div className="metric-subtext">KS &ge; 0.20 or PSI &ge; 0.25</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Moderate Drift Features</span>
          </div>
          <div className="metric-value" style={{ color: drift.medium_drift_count > 0 ? 'var(--state-monitor-text)' : 'inherit' }}>
            {drift.medium_drift_count}
          </div>
          <div className="metric-subtext">0.10 &le; KS &lt; 0.20</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Biomarkers Tested</span>
          </div>
          <div className="metric-value">{drift.features_analyzed_count}</div>
          <div className="metric-subtext">Continuous &amp; categorical</div>
        </div>
      </div>

      {/* Feature Distribution Interactive Comparison */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Reference vs Current Cohort Distributions</h3>
            <p>Select a biomarker to inspect cohort frequency shifts</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Biomarker:</span>
            <select
              className="form-control"
              style={{ width: 160 }}
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
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectedDist} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <XAxis dataKey="bin_label" tick={{ fill: '#8b949e', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: 2 }} />
                <Legend />
                <Bar dataKey="reference_pct" name="Reference Baseline Cohort (%)" fill="#30363d" />
                <Bar dataKey="current_pct" name="Uploaded Current Cohort (%)" fill="#1f6feb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Complete Feature Drift Scorecard Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Feature Drift Scorecard</h3>
            <p>Hypothesis testing against historical reference baseline</p>
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
                    <td>{item.feature_type}</td>
                    <td>{item.drift_method}</td>
                    <td>
                      <span style={{
                        color: item.status === 'HIGH' ? 'var(--state-attention-text)' :
                               item.status === 'MEDIUM' ? 'var(--state-monitor-text)' :
                               'var(--state-normal-text)'
                      }}>
                        {item.drift_score.toFixed(4)}
                      </span>
                    </td>
                    <td>{item.p_value}</td>
                    <td>{item.reference_mean}</td>
                    <td>{item.current_mean}</td>
                    <td>
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
