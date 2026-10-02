import React, { useState } from 'react';
import { Search, Database, Heart, Activity, User, ShieldAlert } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

export default function Dataset({ analysis }) {
  const [searchTerm, setSearchTerm] = useState('');
  if (!analysis) return null;

  const { metadata, overview, preview } = analysis;

  // Prepare Target Chart Data
  const targetData = [
    { name: 'Absence / Low Risk (0)', value: overview.target['0'] || 0, color: '#0284C7' },
    { name: 'Presence / Cardiac Risk (1)', value: overview.target['1'] || 0, color: '#EF4444' }
  ];

  // Prepare Sex Distribution Data
  const sexData = [
    { name: 'Male', value: overview.sex['Male'] || 0, color: '#38BDF8' },
    { name: 'Female', value: overview.sex['Female'] || 0, color: '#F472B6' }
  ];

  // Filter preview records
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
      {/* Overview Cards Strip */}
      <div className="kpi-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Patient Cohort</span>
            <div className="metric-icon-box"><Database size={16} /></div>
          </div>
          <div className="metric-value">{metadata.total_rows}</div>
          <div className="metric-subtext">{metadata.total_columns} clinical attributes</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Mean Resting Blood Pressure</span>
            <div className="metric-icon-box"><Activity size={16} /></div>
          </div>
          <div className="metric-value">{overview.resting_bp_mean} <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>mm Hg</span></div>
          <div className="metric-subtext">Clinical baseline normal: 120-130</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Mean Serum Cholesterol</span>
            <div className="metric-icon-box"><Heart size={16} /></div>
          </div>
          <div className="metric-value">{overview.cholesterol_mean} <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>mg/dL</span></div>
          <div className="metric-subtext">Optimal range: &lt; 200 mg/dL</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Mean Max Exercise HR</span>
            <div className="metric-icon-box"><Activity size={16} /></div>
          </div>
          <div className="metric-value">{overview.max_hr_mean} <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>bpm</span></div>
          <div className="metric-subtext">Cardiac peak capacity</div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid-2">
        {/* Target & Sex Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Diagnosis & Gender Distribution</h3>
              <p>Ground-truth target balance and biological sex representation</p>
            </div>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <h5 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 10, textAlign: 'center' }}>Target Prevalence</h5>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={targetData} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={4}>
                      {targetData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0d131f', borderColor: '#334155', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: '0.75rem', marginTop: 4 }}>
                <span style={{ color: '#0284C7' }}>● Absence: {overview.target['0']}</span>
                <span style={{ color: '#EF4444' }}>● Presence: {overview.target['1']}</span>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 10, textAlign: 'center' }}>Sex Slices</h5>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sexData} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={4}>
                      {sexData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0d131f', borderColor: '#334155', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: '0.75rem', marginTop: 4 }}>
                <span style={{ color: '#38BDF8' }}>● Male: {overview.sex['Male']}</span>
                <span style={{ color: '#F472B6' }}>● Female: {overview.sex['Female']}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Age Histogram */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Patient Age Distribution</h3>
              <p>Stratification across 10-year age brackets</p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.age_distribution}>
                  <XAxis dataKey="bin" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0d131f', borderColor: '#334155', borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
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
            <p>Inspect clinical features, model inference labels, risk probabilities, and diagnostic error classifications</p>
          </div>
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search age, sex, chest pain..."
              className="form-control"
              style={{ paddingLeft: 32, fontSize: '0.8rem', height: 34 }}
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
                  <th>Predicted Risk</th>
                  <th>Prediction</th>
                  <th>Ground Truth</th>
                  <th>Error Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredPreview.map((row, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-dim)' }}>{i + 1}</td>
                    <td><strong>{row.age}</strong></td>
                    <td>{row.sex_desc}</td>
                    <td>{row.cp_desc}</td>
                    <td>{row.trestbps} mm Hg</td>
                    <td>{row.chol} mg/dL</td>
                    <td>{row.thalach} bpm</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: row.predicted_probability >= 0.5 ? '#EF4444' : '#10B981'
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
                      {row.target !== undefined ? (
                        <span style={{ color: row.target === 1 ? '#EF4444' : '#0284C7', fontWeight: 600 }}>
                          {row.target === 1 ? 'Disease (1)' : 'Absence (0)'}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: row.error_classification === 'False Negative' ? '#EF4444' :
                               row.error_classification === 'False Positive' ? '#F59E0B' :
                               'var(--text-muted)'
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
