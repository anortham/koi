import { describe, expect, test } from "bun:test";
import { searchMemories } from "./fuse";
import type { Memory } from "../storage/memory";

const testMemories: Memory[] = [
  {
    id: "mem_1",
    timestamp: 1738680000000,
    content: "## Fixed authentication bug\n\nThe login was failing due to a race condition.",
    tags: ["auth", "bugfix"],
    git: { branch: "main", commit: "abc", dirty: false, filesChanged: [] },
  },
  {
    id: "mem_2",
    timestamp: 1738670000000,
    content: "## Added OAuth2 integration\n\nImplemented Google OAuth for social login.",
    tags: ["auth", "feature"],
    git: { branch: "main", commit: "def", dirty: false, filesChanged: [] },
  },
  {
    id: "mem_3",
    timestamp: 1738660000000,
    content: "## Refactored database queries\n\nOptimized N+1 queries in the user service.",
    tags: ["database", "performance"],
    git: { branch: "main", commit: "ghi", dirty: false, filesChanged: [] },
  },
];

describe("searchMemories", () => {
  test("returns all memories when no query", () => {
    const results = searchMemories(testMemories, {});
    expect(results.length).toBe(3);
  });

  test("filters by query string", () => {
    const results = searchMemories(testMemories, { query: "authentication" });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("mem_1");
  });

  test("fuzzy matches similar terms", () => {
    const results = searchMemories(testMemories, { query: "login" });
    // Should match both auth-related memories
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test("filters by tags", () => {
    const results = searchMemories(testMemories, { tags: ["database"] });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("mem_3");
  });

  test("filters by since timestamp", () => {
    const results = searchMemories(testMemories, { since: 1738675000000 });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("mem_1");
  });

  test("respects limit", () => {
    const results = searchMemories(testMemories, { limit: 2 });
    expect(results.length).toBe(2);
  });

  test("combines query and tag filters", () => {
    const results = searchMemories(testMemories, {
      query: "OAuth",
      tags: ["auth"]
    });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("mem_2");
  });
});
