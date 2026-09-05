import React from 'react';
import { getSeverityColor } from '../../utils/healthColors';

export default function SeverityBadge({ severity, className = '' }) {
  const colors = getSeverityColor(severity);
  const textLabel = severity ? severity.toUpperCase() : 'MEDIUM';

  return (
    <span className={`badge ${colors.bg} ${colors.text} border border-current/10 ${className}`}>
      {textLabel}
    </span>
  );
}
