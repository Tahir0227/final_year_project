import React from 'react';
import { getHealthColor } from '../../utils/healthColors';

export default function HealthBadge({ label, className = '' }) {
  const colors = getHealthColor(label);
  const textLabel = label ? label.replace('_', ' ') : 'UNKNOWN';

  return (
    <span className={`badge ${colors.bg} ${colors.text} ${colors.border} border ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-slow" />
      {textLabel}
    </span>
  );
}
