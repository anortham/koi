import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { parseSince, formatRelativeTime, getDateDir } from "./time";

describe("parseSince", () => {
  test("parses '1d' as 1 day ago", () => {
    const now = Date.now();
    const result = parseSince("1d");
    const expected = now - 24 * 60 * 60 * 1000;
    // Allow 1 second tolerance
    expect(Math.abs(result! - expected)).toBeLessThan(1000);
  });

  test("parses '2w' as 2 weeks ago", () => {
    const now = Date.now();
    const result = parseSince("2w");
    const expected = now - 14 * 24 * 60 * 60 * 1000;
    expect(Math.abs(result! - expected)).toBeLessThan(1000);
  });

  test("parses '12h' as 12 hours ago", () => {
    const now = Date.now();
    const result = parseSince("12h");
    const expected = now - 12 * 60 * 60 * 1000;
    expect(Math.abs(result! - expected)).toBeLessThan(1000);
  });

  test("parses 'yesterday' as start of yesterday", () => {
    const result = parseSince("yesterday");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    expect(result).toBe(yesterday.getTime());
  });

  test("parses ISO date string", () => {
    const result = parseSince("2026-01-15");
    const expected = new Date("2026-01-15").getTime();
    expect(result).toBe(expected);
  });

  test("returns null for invalid input", () => {
    expect(parseSince("invalid")).toBeNull();
    expect(parseSince("")).toBeNull();
  });
});

describe("formatRelativeTime", () => {
  test("formats seconds ago", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 30 * 1000)).toBe("just now");
  });

  test("formats minutes ago", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 5 * 60 * 1000)).toBe("5 min ago");
  });

  test("formats hours ago", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 3 * 60 * 60 * 1000)).toBe("3 hours ago");
  });

  test("formats days ago", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 2 * 24 * 60 * 60 * 1000)).toBe("2 days ago");
  });
});

describe("getDateDir", () => {
  test("returns YYYY-MM-DD format", () => {
    const timestamp = new Date("2026-02-04T15:30:00Z").getTime();
    // Note: result depends on local timezone, so we just check format
    const result = getDateDir(timestamp);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
