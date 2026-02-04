import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { writeMemory, readMemory, listMemories, type Memory } from "./memory";
import { rm, mkdir } from "fs/promises";
import { join } from "path";

const TEST_DIR = "/tmp/koi-test-memories";

describe("memory storage", () => {
  beforeEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test("writeMemory creates markdown file with frontmatter", async () => {
    const memory: Memory = {
      id: "mem_abc123",
      timestamp: 1738680000000,
      content: "## Test Memory\n\nThis is a test.",
      tags: ["test", "example"],
      git: {
        branch: "main",
        commit: "abc1234",
        dirty: false,
        filesChanged: [],
      },
    };

    const path = await writeMemory(TEST_DIR, "2026-02-04", "test.md", memory);

    expect(path).toBe(join(TEST_DIR, "2026-02-04", "test.md"));

    const file = Bun.file(path);
    const content = await file.text();

    expect(content).toContain("---");
    expect(content).toContain("id: mem_abc123");
    expect(content).toContain("## Test Memory");
  });

  test("readMemory parses markdown file with frontmatter", async () => {
    const markdown = `---
id: mem_xyz789
timestamp: 1738680000000
tags:
  - auth
  - bugfix
git:
  branch: feature/login
  commit: def5678
  dirty: true
  filesChanged:
    - src/auth.ts
---

## Fixed login bug

The issue was a race condition.
`;

    const dir = join(TEST_DIR, "2026-02-04");
    await mkdir(dir, { recursive: true });
    await Bun.write(join(dir, "memory.md"), markdown);

    const memory = await readMemory(join(dir, "memory.md"));

    expect(memory.id).toBe("mem_xyz789");
    expect(memory.timestamp).toBe(1738680000000);
    expect(memory.tags).toEqual(["auth", "bugfix"]);
    expect(memory.git.branch).toBe("feature/login");
    expect(memory.content).toContain("## Fixed login bug");
  });

  test("listMemories returns all memories in date directories", async () => {
    // Create test memories
    const day1 = join(TEST_DIR, "2026-02-03");
    const day2 = join(TEST_DIR, "2026-02-04");
    await mkdir(day1, { recursive: true });
    await mkdir(day2, { recursive: true });

    await Bun.write(join(day1, "a.md"), `---
id: mem_a
timestamp: 1738590000000
tags: []
git:
  branch: main
  commit: aaa
  dirty: false
  filesChanged: []
---

Memory A
`);

    await Bun.write(join(day2, "b.md"), `---
id: mem_b
timestamp: 1738680000000
tags: []
git:
  branch: main
  commit: bbb
  dirty: false
  filesChanged: []
---

Memory B
`);

    const memories = await listMemories(TEST_DIR);

    expect(memories.length).toBe(2);
    // Should be sorted by timestamp descending (most recent first)
    expect(memories[0].id).toBe("mem_b");
    expect(memories[1].id).toBe("mem_a");
  });
});
