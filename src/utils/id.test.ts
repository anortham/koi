import { describe, expect, test } from "bun:test";
import { generateMemoryId, generateFilename } from "./id";

describe("generateMemoryId", () => {
  test("returns string starting with mem_", () => {
    const id = generateMemoryId();
    expect(id.startsWith("mem_")).toBe(true);
  });

  test("returns 16 character id after prefix", () => {
    const id = generateMemoryId();
    // mem_ (4) + 16 hex chars = 20 total
    expect(id.length).toBe(20);
  });

  test("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateMemoryId()));
    expect(ids.size).toBe(100);
  });
});

describe("generateFilename", () => {
  test("returns .md filename with timestamp and random suffix", () => {
    const filename = generateFilename();
    expect(filename).toMatch(/^\d{6}_[a-f0-9]{4}\.md$/);
  });

  test("generates unique filenames", () => {
    const names = new Set(Array.from({ length: 100 }, () => generateFilename()));
    expect(names.size).toBe(100);
  });
});
