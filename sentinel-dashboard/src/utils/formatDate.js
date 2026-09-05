import { formatDistanceToNow, format } from 'date-fns';

export function timeAgo(date) {
  if (!date) return 'Never';
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); }
  catch { return 'Unknown'; }
}

export function formatDate(date, fmt = 'MMM d, yyyy') {
  if (!date) return '—';
  try { return format(new Date(date), fmt); }
  catch { return '—'; }
}

export function formatDateTime(date) {
  return formatDate(date, 'MMM d, yyyy HH:mm');
}
