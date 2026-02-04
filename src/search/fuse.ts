import Fuse from "fuse.js";
import type { Memory } from "../storage/memory";

export interface SearchOptions {
  query?: string;
  tags?: string[];
  since?: number; // Unix timestamp (ms)
  limit?: number;
}

/**
 * Search memories using Fuse.js fuzzy matching.
 */
export function searchMemories(
  memories: Memory[],
  options: SearchOptions
): Memory[] {
  const { query, tags, since, limit = 10 } = options;

  let filtered = memories;

  // Filter by since timestamp
  if (since) {
    filtered = filtered.filter((m) => m.timestamp >= since);
  }

  // Filter by tags (match ANY tag)
  if (tags && tags.length > 0) {
    filtered = filtered.filter((m) =>
      m.tags.some((t) => tags.includes(t))
    );
  }

  // If no query, return filtered results (sorted by timestamp desc)
  if (!query) {
    return filtered.slice(0, limit);
  }

  // Fuzzy search with Fuse.js
  // Only search content - tags are handled by explicit tag filtering
  const fuse = new Fuse(filtered, {
    keys: ["content"],
    threshold: 0.15,
    ignoreLocation: true,
    includeScore: true,
  });

  const results = fuse.search(query);

  return results.slice(0, limit).map((r) => r.item);
}
