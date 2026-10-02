import React, { useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

export default function Dataset({ analysis }) {
  const [searchTerm, setSearchTerm] = useState('');
  if (!analysis) return null;

  const { metadata, overview, preview } = analysis;

  const targetData = [
    { name: 'Absence / Low Risk (0)', value: overview.target['0'] || 0, color: '#1f6feb' },
    { name: 'Presence / Risk (1)', value: overview.target['1'] || 0, color: '#da3633' }
  ];

  const sexData = [
    { name: 'Male', value: overview.sex['Male'] || 0, color: '#388bfd' },
    { name: 'Female', value: overview.sex['Female'] || 0, color: '#8b949e' }
  ];

  const filteredPreview = (preview || []).filter((row) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      String(row.age).includes(term) ||
      String(row.sex_desc || '').toLowerCase().includes(term) ||
      String(row.cp_desc || '').toLowerCase().includes(term) ||
      String(row.prediction_label || '').toLowerCase().includes(term) ||
      String(row.error_classification || '').toLowerCase().includes(term)
    );
  });

  return (
    <div>
      {/* Overview Cards Strip (4 items) */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Cohort</span>
          </div>
          <div className="metric-value">{metadata.total_rows}</div>
          <div className="metric-subtext">{metadata.total_columns} clinical attributes</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Mean Resting BP</span>
          </div>
          <div className="metric-value">{overview.resting_bp_mean} mm Hg</div>
          <div className="metric-subtext">Clinical norm: 120-130</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Mean Cholesterol</span>
          </div>
          <div className="metric-value">{overview.cholesterol_mean} mg/dL</div>
          <div className="metric-subtext">Optimal range: &lt; 200</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Mean Peak Exercise HR</span>
          </div>
          <div className="metric-value">{overview.max_hr_mean} bpm</div>
          <div className="metric-subtext">Peak achieved capacity</div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Diagnosis and Sex Slices</h3>
              <p>Ground-truth balance and demographic breakdown</p>
            </div>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Target Prevalence</div>
              <div style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={targetData} dataKey="value" innerRadius={35} outerRadius={55}>
                      {targetData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: 2 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Absence: {overview.target['0']} | Presence: {overview.target['1']}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Biological Sex</div>
              <div style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sexData} dataKey="value" innerRadius={35} outerRadius={55}>
                      {sexData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: 2 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Male: {overview.sex['Male']} | Female: {overview.sex['Female']}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Patient Age Distribution</h3>
              <p>10-year cohort histogram</p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.age_distribution}>
                  <XAxis dataKey="bin" tick={{ fill: '#8b949e', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: 2 }} />
                  <Bar dataKey="count" fill="#1f6feb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Data Preview Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Evaluated Dataset Records (First 50 Rows)</h3>
            <p>Clinical features, model inference labels, risk probabilities, and diagnostic error classifications</p>
          </div>
          <div style={{ width: 220 }}>
            <input
              type="text"
              placeholder="Filter table rows..."
              className="form-control"
              style={{ fontSize: '0.75rem', width: '100%' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Chest Pain</th>
                  <th>Resting BP</th>
                  <th>Cholesterol</th>
                  <th>Max HR</th>
                  <th>Risk Prob</th>
                  <th>Prediction</th>
                  <th>Ground Truth</th>
                  <th>Error Classification</th>
                </tr>
              </thead>
              <tbody>
                {filteredPreview.map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{row.age}</td>
                    <td>{row.sex_desc}</td>
                    <td>{row.cp_desc}</td>
                    <td>{row.trestbps}</td>
                    <td>{row.chol}</td>
                    <td>{row.thalach}</td>
                    <td>
                      <span style={{
                        color: row.predicted_probability >= 0.5 ? 'var(--state-attention-text)' : 'var(--state-normal-text)'
                      }}>
                        {(row.predicted_probability * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${row.prediction_label === 'Higher Risk' ? 'attention' : 'normal'}`}>
                        {row.prediction_label}
                      </span>
                    </td>
                    <td>
                      {row.target !== undefined ? (row.target === 1 ? 'Presence (1)' : 'Absence (0)') : '-'}
                    </td>
                    <td>
                      <span style={{
                        color: row.error_classification === 'False Negative' ? 'var(--state-attention-text)' :
                               row.error_classification === 'False Positive' ? 'var(--state-monitor-text)' :
                               'var(--text-secondary)'
                      }}>
                        {row.error_classification || 'Inference'}
                      </span>
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
