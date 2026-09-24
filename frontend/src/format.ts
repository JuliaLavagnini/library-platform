const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export function formatDate(value: string | null | undefined) {
  return value ? dateFormat.format(new Date(value)) : '—';
}

// "in 3 days", "today", "2 days ago"
const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const DAY_MS = 24 * 60 * 60 * 1000;

export function formatRelativeDays(value: string) {
  const days = Math.round((new Date(value).getTime() - Date.now()) / DAY_MS);
  return relativeFormat.format(days, 'day');
}
