export function getHealthColor(label) {
  switch ((label || '').toUpperCase()) {
    case 'HEALTHY':  return { text: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30',  hex: '#22c55e' };
    case 'AT_RISK':  return { text: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  hex: '#f59e0b' };
    case 'CRITICAL': return { text: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/30',    hex: '#ef4444' };
    default:         return { text: 'text-dark-400',   bg: 'bg-dark-700',      border: 'border-dark-700',      hex: '#64748b' };
  }
}

export function getSeverityColor(severity) {
  switch ((severity || '').toUpperCase()) {
    case 'CRITICAL': return { text: 'text-red-400',    bg: 'bg-red-500/15',    hex: '#ef4444' };
    case 'HIGH':     return { text: 'text-orange-400', bg: 'bg-orange-500/15', hex: '#f97316' };
    case 'MEDIUM':   return { text: 'text-amber-400',  bg: 'bg-amber-500/15',  hex: '#f59e0b' };
    case 'LOW':      return { text: 'text-blue-400',   bg: 'bg-blue-500/15',   hex: '#3b82f6' };
    default:         return { text: 'text-dark-400',   bg: 'bg-dark-700',      hex: '#64748b' };
  }
}

export function getStabilityColor(score) {
  if (score === null || score === undefined) return '#64748b';
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export function getNotifTypeColor(type) {
  switch (type) {
    case 'CRITICAL_ALERT':      return { icon: '🔴', text: 'text-red-400',    bg: 'bg-red-500/10' };
    case 'HIGH_ALERT':          return { icon: '🟠', text: 'text-orange-400', bg: 'bg-orange-500/10' };
    case 'MEDIUM_ALERT':        return { icon: '🟡', text: 'text-amber-400',  bg: 'bg-amber-500/10' };
    case 'SCAN_COMPLETE':       return { icon: '✅', text: 'text-green-400',  bg: 'bg-green-500/10' };
    case 'SCAN_FAILED':         return { icon: '❌', text: 'text-red-400',    bg: 'bg-red-500/10' };
    case 'PRESCRIPTION_READY':  return { icon: '💊', text: 'text-purple-400', bg: 'bg-purple-500/10' };
    case 'PROJECT_ENDING_SOON': return { icon: '⏰', text: 'text-amber-400',  bg: 'bg-amber-500/10' };
    case 'PROJECT_ENDED':       return { icon: '📅', text: 'text-dark-400',   bg: 'bg-dark-800' };
    default:                    return { icon: 'ℹ', text: 'text-blue-400',   bg: 'bg-blue-500/10' };
  }
}
