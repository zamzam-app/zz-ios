// ─── Time Formatting ────────────────────────────────────────────────────────

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Format an ISO timestamp into a relative time string.
 *
 * Examples: "Just now", "2m ago", "3h ago", "Yesterday", "2d ago", "Jan 15"
 */
export function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();

  if (Number.isNaN(then)) return isoTimestamp;

  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 0) return 'Just now';
  if (diffSec < MINUTE) return 'Just now';
  if (diffSec < HOUR) {
    const mins = Math.floor(diffSec / MINUTE);
    return `${mins}m ago`;
  }
  if (diffSec < DAY) {
    const hours = Math.floor(diffSec / HOUR);
    return `${hours}h ago`;
  }
  if (diffSec < 2 * DAY) return 'Yesterday';
  if (diffSec < WEEK) {
    const days = Math.floor(diffSec / DAY);
    return `${days}d ago`;
  }

  // Older: show date
  const date = new Date(then);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Format an ISO timestamp into a full date-time string.
 * Example: "Oct 24, 2023 · 11:30 AM"
 */
export function formatFullDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  return `${month} ${day}, ${year} · ${hour12}:${minutes} ${ampm}`;
}
