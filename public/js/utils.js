/** Format a relative time label from an ISO date string. */
export function timeAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0)   return 'today';
  if (d === 1)   return 'yesterday';
  if (d < 30)    return `${d}d ago`;
  if (d < 365)   return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

/** Minimal HTML escaping for user-supplied strings. */
export function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
