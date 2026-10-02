import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import {
  Calendar,
  AlertTriangle,
  Play,
  TrendingDown,
  Scale,
  RefreshCw,
  Info
} from 'lucide-react';
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
      setErrorMsg(err.message || 'Failed to generate simulation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulation();
  }, []);

  // Format performance trend
  const perfTimeline = (simData?.performance_timeline || []).map(p => ({
    period: p.period.replace('Month ', 'M'),
    Accuracy: Number((p.accuracy * 100).toFixed(1)),
    Recall: Number((p.recall * 100).toFixed(1)),
    FNR: Number((p.false_negative_rate * 100).toFixed(1))
  }));

  // Format gender disparity trend
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
      {/* Prominent Educational Compliance Banner */}
      <div style={{
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <AlertTriangle size={24} color="#F59E0B" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FDE68A' }}>
              SIMULATED LONGITUDINAL MONITORING DATA (ACADEMIC LAB USE ONLY)
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Because a single CSV represents one snapshot, this simulation engine generates controlled monthly cohorts
              with escalating physiological drift to demonstrate how continuous clinical monitoring functions across multiple time periods.
            </p>
          </div>
        </div>

        <button
          className="btn-secondary"
          onClick={fetchSimulation}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Re-running Engine...' : 'Re-Run Simulation'}</span>
        </button>
      </div>

      {/* Grid: 2 Trajectory Charts */}
      <div className="grid-2">
        {/* Performance Decay */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Model Performance Decay Across Months</h3>
              <p>Overall Accuracy, Recall, and False Negative Rate</p>
            </div>
            <StatusBadge status="Attention" label="Month 4-5 Drift" />
          </div>
          <div className="card-body">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perfTimeline} margin={{ top: 15, right: 20, left: 10, bottom: 15 }}>
                  <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0d131f', borderColor: '#334155', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  <ReferenceLine y={80} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Target (80%)', fill: '#10B981', fontSize: 10 }} />
                  <Line type="monotone" dataKey="Accuracy" stroke="#0EA5E9" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Recall" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="FNR" name="False Negative Rate (%)" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Fairness Disparity Surge */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Female False Negative Rate Surge (Gender Disparity)</h3>
              <p>Male vs Female FNR tracking over simulated deployment</p>
            </div>
            <StatusBadge status="Attention" label="FNR Gap > 30%" />
          </div>
          <div className="card-body">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={genderTimeline} margin={{ top: 15, right: 20, left: 10, bottom: 15 }}>
                  <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 45]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0d131f', borderColor: '#334155', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  <ReferenceLine y={20} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Acceptable Cap (20%)', fill: '#EF4444', fontSize: 10 }} />
                  <Line type="monotone" dataKey="Male_FNR" name="Male FNR (%)" stroke="#38BDF8" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Female_FNR" name="Female FNR (%) - Critical Harm" stroke="#EF4444" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Longitudinal Timeline Explanations */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Longitudinal Monitoring Cohort Specifications</h3>
            <p>Chronological distribution perturbation narrative (Months 0 to 5)</p>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700 }}>MONTH 0</span>
              <h5 style={{ fontSize: '0.85rem', color: '#fff', margin: '4px 0' }}>Baseline Ref</h5>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Gold-standard historical training distribution. Accuracy: 88.5%.</p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700 }}>MONTH 1</span>
              <h5 style={{ fontSize: '0.85rem', color: '#fff', margin: '4px 0' }}>Stable Intake</h5>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Resampled population + 1% measurement noise. Minimal drift.</p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.7rem', color: '#F59E0B', fontWeight: 700 }}>MONTH 2</span>
              <h5 style={{ fontSize: '0.85rem', color: '#fff', margin: '4px 0' }}>Seasonal Shift</h5>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Winter elevation: +5% BP, +4% cholesterol. Moderate drift.</p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.7rem', color: '#F59E0B', fontWeight: 700 }}>MONTH 3</span>
              <h5 style={{ fontSize: '0.85rem', color: '#fff', margin: '4px 0' }}>Aging Catchment</h5>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Mean age +8 yrs, lower exercise max heart rate. Age KS: 0.445.</p>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: 14, borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <span style={{ fontSize: '0.7rem', color: '#EF4444', fontWeight: 700 }}>MONTH 4</span>
              <h5 style={{ fontSize: '0.85rem', color: '#fff', margin: '4px 0' }}>Female Atypical</h5>
              <p style={{ fontSize: '0.72rem', color: '#FCA5A5' }}>Female chest pain presentation shifts to atypical. FNR surges to 36.4%!</p>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: 14, borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <span style={{ fontSize: '0.7rem', color: '#EF4444', fontWeight: 700 }}>MONTH 5</span>
              <h5 style={{ fontSize: '0.85rem', color: '#fff', margin: '4px 0' }}>Severe Compound</h5>
              <p style={{ fontSize: '0.72rem', color: '#FCA5A5' }}>High-acuity comorbidity. Drift across 5 features. Retraining required.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
