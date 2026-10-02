import React from 'react';
import StatusBadge from './StatusBadge';

export default function MetricCard({ label, value, subtext, status = null }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        {status && <StatusBadge status={status} />}
      </div>
      <div className="metric-value">{value}</div>
      {subtext && <div className="metric-subtext">{subtext}</div>}
    </div>
  );
}
