import React from 'react';

export default function StatusBadge({ status = 'Normal', label = null }) {
  const normStatus = (status || 'Normal').toLowerCase();
  
  let badgeClass = 'normal';
  if (normStatus.includes('attention') || normStatus.includes('high') || normStatus.includes('critical')) {
    badgeClass = 'attention';
  } else if (normStatus.includes('monitor') || normStatus.includes('medium') || normStatus.includes('warning')) {
    badgeClass = 'monitor';
  }

  const displayText = label || (badgeClass === 'attention' ? 'Attention' : badgeClass === 'monitor' ? 'Monitor' : 'Normal');

  return (
    <span className={`status-badge ${badgeClass}`}>
      {displayText}
    </span>
  );
}
