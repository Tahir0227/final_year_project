import React from 'react';
import { computeDaysRemaining, getDeadlineConfig } from '../../utils/deadlineUtils';

export default function DeadlineCountdown({ endDate, className = '' }) {
  const days = computeDaysRemaining(endDate);
  const config = getDeadlineConfig(days);

  if (days === null) return null;

  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold ${config.color} ${className}`}>
      <span className={config.pulse ? 'animate-pulse' : ''}>{config.icon}</span>
      <span className={config.pulse ? 'animate-pulse' : ''}>{config.label}</span>
    </div>
  );
}
