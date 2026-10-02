import React from 'react';
import StatusBadge from './StatusBadge';

export default function MetricCard({ label, value, subtext, icon: Icon, status = null }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        {status ? (
          <StatusBadge status={status} />
        ) : Icon ? (
          <div className="metric-icon-box">
            <Icon size={16} />
          </div>
        ) : null}
      </div>
      <div className="metric-value">{value}</div>
      {subtext && <div className="metric-subtext">{subtext}</div>}
    </div>
  );
}
