/**
 * Parse a "since" filter string into a Unix timestamp (ms).
 * Supports: "1d", "2w", "12h", "yesterday", ISO dates
 */
export function parseSince(since: string): number | null {
  if (!since) return null;

  const now = Date.now();

  // Handle relative time: 1d, 2w, 12h
  const relativeMatch = since.match(/^(\d+)([hdw])$/);
  if (relativeMatch) {
    const [, amount, unit] = relativeMatch;
    const num = parseInt(amount, 10);
    const multipliers: Record<string, number> = {
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    };
    return now - num * multipliers[unit];
  }

  // Handle "yesterday"
  if (since === "yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return yesterday.getTime();
  }

  // Handle "today"
  if (since === "today") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }

  // Try ISO date
  try {
    const date = new Date(since);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  } catch {
    // Fall through
  }

  return null;
}

/**
 * Format a timestamp as relative time (e.g., "5 min ago").
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/**
 * Get the date directory name for a timestamp.
 * Format: YYYY-MM-DD (UTC for consistency)
 */
export function getDateDir(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split("T")[0];
}
