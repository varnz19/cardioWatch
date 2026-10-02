import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { runMonitoringSimulation } from '../services/api';

export default function Simulation() {
  const [loading, setLoading] = useState(false);
  const [simData, setSimData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchSimulation = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await runMonitoringSimulation();
      setSimData(res);
    } catch (err) {
      setErrorMsg(err.message || 'Simulation generation failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulation();
  }, []);

  const perfTimeline = (simData?.performance_timeline || []).map(p => ({
    period: p.period.replace('Month ', 'M'),
    Accuracy: Number((p.accuracy * 100).toFixed(1)),
    Recall: Number((p.recall * 100).toFixed(1)),
    FNR: Number((p.false_negative_rate * 100).toFixed(1))
  }));

  const fairnessRaw = simData?.fairness_timeline || [];
  const sexFairness = fairnessRaw.filter(f => f.group_type === 'Biological Sex');

  const genderTimeline = [];
  const uniqueMonths = [...new Set(sexFairness.map(f => f.period))];
  
  uniqueMonths.forEach(m => {
    const maleEntry = sexFairness.find(f => f.period === m && f.group === 'Male');
    const femaleEntry = sexFairness.find(f => f.period === m && f.group === 'Female');
    if (maleEntry && femaleEntry) {
      genderTimeline.push({
        period: m.replace('Month ', 'M'),
        Male_Recall: Number((maleEntry.recall * 100).toFixed(1)),
        Female_Recall: Number((femaleEntry.recall * 100).toFixed(1)),
        Male_FNR: Number((maleEntry.fnr * 100).toFixed(1)),
        Female_FNR: Number((femaleEntry.fnr * 100).toFixed(1)),
        Gap: Number((Math.abs(maleEntry.fnr - femaleEntry.fnr) * 100).toFixed(1))
      });
    }
  });

  return (
    <div>
      {/* Notice */}
      <div className="notice-box" style={{ marginTop: 0, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>SIMULATED DATA (ACADEMIC LAB USE ONLY):</strong> Controlled longitudinal cohorts simulating 5 progressive deployment windows. Demonstrates model performance decay, feature drift, and female false-negative rate surges over time.
        </div>
        <button
          className="btn-secondary"
          onClick={fetchSimulation}
          disabled={loading}
          style={{ whiteSpace: 'nowrap', marginLeft: 16 }}
        >
          {loading ? 'Re-running...' : 'Re-Run Simulation'}
        </button>
      </div>

      {/* Grid: 2 Trajectory Charts */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Model Performance Decay Over Time</h3>
              <p>Overall Accuracy, Recall, and False Negative Rate across cohorts</p>
            </div>
            <StatusBadge status="Attention" label="Month 4-5 Drift" />
          </div>
          <div className="card-body">
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perfTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <XAxis dataKey="period" tick={{ fill: '#8b949e', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: 2 }} />
                  <Legend />
                  <ReferenceLine y={80} stroke="#238636" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="Accuracy" stroke="#1f6feb" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Recall" stroke="#238636" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="FNR" name="False Negative Rate (%)" stroke="#da3633" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Female False Negative Rate Divergence</h3>
              <p>Male versus Female FNR progression across deployment</p>
            </div>
            <StatusBadge status="Attention" label="FNR Gap > 30%" />
          </div>
          <div className="card-body">
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={genderTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <XAxis dataKey="period" tick={{ fill: '#8b949e', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} domain={[0, 45]} />
                  <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: 2 }} />
                  <Legend />
                  <ReferenceLine y={20} stroke="#da3633" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="Male_FNR" name="Male FNR (%)" stroke="#388bfd" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Female_FNR" name="Female FNR (%)" stroke="#da3633" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Cohort Specifications */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Longitudinal Cohort Specifications</h3>
            <p>Chronological distribution perturbation narrative (Months 0 to 5)</p>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            <div style={{ background: 'var(--bg-subtle)', padding: 10, border: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--state-normal-text)', fontWeight: 700 }}>MONTH 0</span>
              <h5 style={{ fontSize: '0.8rem', margin: '2px 0' }}>Baseline Ref</h5>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Historical training baseline. Accuracy 88.5%.</p>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: 10, border: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--state-normal-text)', fontWeight: 700 }}>MONTH 1</span>
              <h5 style={{ fontSize: '0.8rem', margin: '2px 0' }}>Stable Intake</h5>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Resampled baseline with minor noise. Minimal drift.</p>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: 10, border: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--state-monitor-text)', fontWeight: 700 }}>MONTH 2</span>
              <h5 style={{ fontSize: '0.8rem', margin: '2px 0' }}>Seasonal Shift</h5>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Winter elevation: +5% BP, +4% cholesterol.</p>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: 10, border: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--state-monitor-text)', fontWeight: 700 }}>MONTH 3</span>
              <h5 style={{ fontSize: '0.8rem', margin: '2px 0' }}>Aging Catchment</h5>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mean age +8 yrs, lower max heart rate.</p>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: 10, border: '1px solid var(--state-attention)' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--state-attention-text)', fontWeight: 700 }}>MONTH 4</span>
              <h5 style={{ fontSize: '0.8rem', margin: '2px 0' }}>Female Atypical</h5>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Female atypical chest pain. FNR surges to 36.4%.</p>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: 10, border: '1px solid var(--state-attention)' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--state-attention-text)', fontWeight: 700 }}>MONTH 5</span>
              <h5 style={{ fontSize: '0.8rem', margin: '2px 0' }}>Compound Shift</h5>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Multi-biomarker drift. Retraining required.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
