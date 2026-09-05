export function computeDaysRemaining(project_end_date) {
  if (!project_end_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(project_end_date);
  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
}

export function getDeadlineStatus(days) {
  if (days === null || days === undefined) return 'unknown';
  if (days < 0)   return 'ended';
  if (days === 0) return 'today';
  if (days <= 7)  return 'urgent';
  if (days <= 30) return 'warning';
  return 'normal';
}

export function getDeadlineConfig(days) {
  const status = getDeadlineStatus(days);
  switch (status) {
    case 'ended':   return { label: `Ended ${Math.abs(days)} day(s) ago`, color: 'text-dark-400', pulse: false, icon: '📅' };
    case 'today':   return { label: 'TODAY IS DEADLINE',                   color: 'text-red-400',  pulse: true,  icon: '🔴' };
    case 'urgent':  return { label: `${days} day(s) remaining`,           color: 'text-red-400',  pulse: true,  icon: '🔴' };
    case 'warning': return { label: `${days} days remaining`,             color: 'text-amber-400', pulse: false, icon: '⚠️' };
    default:        return { label: `${days} days remaining`,             color: 'text-dark-300',  pulse: false, icon: '📅' };
  }
}
