# Koi Memory System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a lean MCP server with `remember`/`recall` tools for agent memory persistence.

**Architecture:** Project-local `.memories/` storage with markdown+YAML frontmatter, central `~/.koi/registry.json` for cross-project discovery, Fuse.js for search.

**Tech Stack:** Bun, TypeScript, @modelcontextprotocol/sdk, Fuse.js, gray-matter (YAML frontmatter parsing)

---

## Task 1: Initialize Bun Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts` (placeholder)

**Step 1: Initialize with Bun**

Run:
```bash
cd /Users/murphy/source/koi && bun init -y
```

**Step 2: Update package.json**

Replace `package.json` with:
```json
{
  "name": "koi",
  "version": "0.1.0",
  "description": "Lean MCP server for agent memory persistence",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "start": "bun run src/index.ts",
    "dev": "bun --watch run src/index.ts",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "fuse.js": "^7.1.0",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  }
}
```

**Step 3: Update tsconfig.json**

Replace `tsconfig.json` with:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["bun-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Install dependencies**

Run:
```bash
cd /Users/murphy/source/koi && bun install
```

**Step 5: Create placeholder entry point**

Create `src/index.ts`:
```typescript
#!/usr/bin/env bun

console.error("Koi MCP Server starting...");
```

**Step 6: Verify setup**

Run:
```bash
cd /Users/murphy/source/koi && bun run start
```
Expected: "Koi MCP Server starting..."

**Step 7: Commit**

```bash
git add -A && git commit -m "chore: initialize bun project with dependencies"
```

---

## Task 2: ID Generation Utility

**Files:**
- Create: `src/utils/id.ts`
- Create: `src/utils/id.test.ts`

**Step 1: Write the failing test**

Create `src/utils/id.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/utils/id.test.ts
```
Expected: FAIL - cannot find module "./id"

**Step 3: Write minimal implementation**

Create `src/utils/id.ts`:
```typescript
import { randomBytes } from "crypto";

/**
 * Generate a unique memory ID.
 * Format: mem_{16 hex chars}
 */
export function generateMemoryId(): string {
  const random = randomBytes(8).toString("hex");
  return `mem_${random}`;
}

/**
 * Generate a unique filename for a memory file.
 * Format: HHMMSS_XXXX.md
 */
export function generateFilename(): string {
  const now = new Date();
  const time = [
    now.getHours().toString().padStart(2, "0"),
    now.getMinutes().toString().padStart(2, "0"),
    now.getSeconds().toString().padStart(2, "0"),
  ].join("");
  const random = randomBytes(2).toString("hex");
  return `${time}_${random}.md`;
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/utils/id.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/id.ts src/utils/id.test.ts && git commit -m "feat: add ID generation utilities"
```

---

## Task 3: Time Parsing Utility

**Files:**
- Create: `src/utils/time.ts`
- Create: `src/utils/time.test.ts`

**Step 1: Write the failing test**

Create `src/utils/time.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/utils/time.test.ts
```
Expected: FAIL - cannot find module "./time"

**Step 3: Write minimal implementation**

Create `src/utils/time.ts`:
```typescript
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
 * Format: YYYY-MM-DD (local timezone)
 */
export function getDateDir(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split("T")[0];
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/utils/time.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/time.ts src/utils/time.test.ts && git commit -m "feat: add time parsing utilities"
```

---

## Task 4: Git Context Utility

**Files:**
- Create: `src/utils/git.ts`
- Create: `src/utils/git.test.ts`

**Step 1: Write the failing test**

Create `src/utils/git.test.ts`:
```typescript
import { describe, expect, test } from "bun:test";
import { getGitContext, type GitContext } from "./git";

describe("getGitContext", () => {
  test("returns object with expected shape", async () => {
    const context = await getGitContext();

    expect(context).toHaveProperty("branch");
    expect(context).toHaveProperty("commit");
    expect(context).toHaveProperty("dirty");
    expect(context).toHaveProperty("filesChanged");

    expect(typeof context.branch).toBe("string");
    expect(typeof context.commit).toBe("string");
    expect(typeof context.dirty).toBe("boolean");
    expect(Array.isArray(context.filesChanged)).toBe(true);
  });

  test("returns 'unknown' values when not in git repo", async () => {
    // Run from /tmp which is not a git repo
    const context = await getGitContext("/tmp");

    expect(context.branch).toBe("unknown");
    expect(context.commit).toBe("unknown");
    expect(context.dirty).toBe(false);
    expect(context.filesChanged).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/utils/git.test.ts
```
Expected: FAIL - cannot find module "./git"

**Step 3: Write minimal implementation**

Create `src/utils/git.ts`:
```typescript
import { spawn } from "bun";

export interface GitContext {
  branch: string;
  commit: string;
  dirty: boolean;
  filesChanged: string[];
}

const FALLBACK: GitContext = {
  branch: "unknown",
  commit: "unknown",
  dirty: false,
  filesChanged: [],
};

async function runGit(args: string[], cwd?: string): Promise<string | null> {
  try {
    const proc = spawn(["git", ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    return exitCode === 0 ? output.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Get current git context (branch, commit, dirty status, changed files).
 * Returns fallback values if not in a git repo.
 */
export async function getGitContext(cwd?: string): Promise<GitContext> {
  // Check if we're in a git repo
  const gitRoot = await runGit(["rev-parse", "--show-toplevel"], cwd);
  if (!gitRoot) return FALLBACK;

  // Get branch
  const branch = (await runGit(["branch", "--show-current"], cwd)) || "unknown";

  // Get commit (short hash)
  const commit = (await runGit(["rev-parse", "--short", "HEAD"], cwd)) || "unknown";

  // Get status
  const status = await runGit(["status", "--porcelain"], cwd);
  const dirty = !!status && status.length > 0;

  // Parse changed files
  const filesChanged: string[] = [];
  if (status) {
    for (const line of status.split("\n")) {
      if (line.length > 3) {
        filesChanged.push(line.slice(3));
      }
    }
  }

  return { branch, commit, dirty, filesChanged };
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/utils/git.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/git.ts src/utils/git.test.ts && git commit -m "feat: add git context utility"
```

---

## Task 5: Memory File Storage (Read/Write Markdown)

**Files:**
- Create: `src/storage/memory.ts`
- Create: `src/storage/memory.test.ts`

**Step 1: Write the failing test**

Create `src/storage/memory.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/storage/memory.test.ts
```
Expected: FAIL - cannot find module "./memory"

**Step 3: Write minimal implementation**

Create `src/storage/memory.ts`:
```typescript
import { mkdir, readdir } from "fs/promises";
import { join } from "path";
import matter from "gray-matter";
import type { GitContext } from "../utils/git";

export interface Memory {
  id: string;
  timestamp: number;
  content: string;
  tags: string[];
  git: GitContext;
  project?: string; // Only set in global queries
}

/**
 * Write a memory to a markdown file with YAML frontmatter.
 */
export async function writeMemory(
  baseDir: string,
  dateDir: string,
  filename: string,
  memory: Memory
): Promise<string> {
  const dir = join(baseDir, dateDir);
  await mkdir(dir, { recursive: true });

  const { content, ...frontmatter } = memory;
  const markdown = matter.stringify(content, frontmatter);

  const path = join(dir, filename);
  await Bun.write(path, markdown);

  return path;
}

/**
 * Read a memory from a markdown file.
 */
export async function readMemory(path: string): Promise<Memory> {
  const file = Bun.file(path);
  const text = await file.text();
  const { data, content } = matter(text);

  return {
    id: data.id,
    timestamp: data.timestamp,
    content: content.trim(),
    tags: data.tags || [],
    git: data.git || {
      branch: "unknown",
      commit: "unknown",
      dirty: false,
      filesChanged: [],
    },
    project: data.project,
  };
}

/**
 * List all memories in a .memories directory.
 * Returns memories sorted by timestamp descending (most recent first).
 */
export async function listMemories(baseDir: string): Promise<Memory[]> {
  const memories: Memory[] = [];

  try {
    const entries = await readdir(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Skip non-date directories
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.name)) continue;

      const dateDir = join(baseDir, entry.name);
      const files = await readdir(dateDir);

      for (const file of files) {
        if (!file.endsWith(".md")) continue;
        try {
          const memory = await readMemory(join(dateDir, file));
          memories.push(memory);
        } catch {
          // Skip invalid files
        }
      }
    }
  } catch {
    // Directory doesn't exist, return empty
  }

  // Sort by timestamp descending
  memories.sort((a, b) => b.timestamp - a.timestamp);

  return memories;
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/storage/memory.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/storage/memory.ts src/storage/memory.test.ts && git commit -m "feat: add memory file storage (markdown + frontmatter)"
```

---

## Task 6: Registry Management

**Files:**
- Create: `src/storage/registry.ts`
- Create: `src/storage/registry.test.ts`

**Step 1: Write the failing test**

Create `src/storage/registry.test.ts`:
```typescript
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  registerProject,
  getRegisteredProjects,
  type ProjectEntry
} from "./registry";
import { rm, mkdir } from "fs/promises";
import { join } from "path";

const TEST_REGISTRY_DIR = "/tmp/koi-test-registry";

describe("registry", () => {
  beforeEach(async () => {
    await rm(TEST_REGISTRY_DIR, { recursive: true, force: true });
    await mkdir(TEST_REGISTRY_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_REGISTRY_DIR, { recursive: true, force: true });
  });

  test("registerProject creates registry file if not exists", async () => {
    const registryPath = join(TEST_REGISTRY_DIR, "registry.json");

    await registerProject(registryPath, "/Users/test/project-a", "project-a");

    const file = Bun.file(registryPath);
    expect(await file.exists()).toBe(true);

    const content = await file.json();
    expect(content.version).toBe(1);
    expect(content.projects["/Users/test/project-a"]).toBeDefined();
    expect(content.projects["/Users/test/project-a"].name).toBe("project-a");
  });

  test("registerProject updates existing project entry", async () => {
    const registryPath = join(TEST_REGISTRY_DIR, "registry.json");

    await registerProject(registryPath, "/Users/test/project-a", "project-a");
    const firstAccess = (await Bun.file(registryPath).json()).projects["/Users/test/project-a"].lastAccess;

    // Wait a bit and register again
    await new Promise(r => setTimeout(r, 10));
    await registerProject(registryPath, "/Users/test/project-a", "project-a");
    const secondAccess = (await Bun.file(registryPath).json()).projects["/Users/test/project-a"].lastAccess;

    expect(secondAccess).toBeGreaterThan(firstAccess);
  });

  test("getRegisteredProjects returns all projects", async () => {
    const registryPath = join(TEST_REGISTRY_DIR, "registry.json");

    await registerProject(registryPath, "/Users/test/project-a", "project-a");
    await registerProject(registryPath, "/Users/test/project-b", "project-b");

    const projects = await getRegisteredProjects(registryPath);

    expect(projects.length).toBe(2);
    expect(projects.map(p => p.path).sort()).toEqual([
      "/Users/test/project-a",
      "/Users/test/project-b",
    ]);
  });

  test("getRegisteredProjects returns empty array if registry doesn't exist", async () => {
    const registryPath = join(TEST_REGISTRY_DIR, "nonexistent.json");

    const projects = await getRegisteredProjects(registryPath);

    expect(projects).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/storage/registry.test.ts
```
Expected: FAIL - cannot find module "./registry"

**Step 3: Write minimal implementation**

Create `src/storage/registry.ts`:
```typescript
import { mkdir } from "fs/promises";
import { dirname } from "path";

export interface ProjectEntry {
  path: string;
  name: string;
  lastAccess: number;
}

interface Registry {
  version: number;
  projects: Record<string, { name: string; lastAccess: number }>;
}

/**
 * Register a project in the central registry.
 * Creates the registry file if it doesn't exist.
 */
export async function registerProject(
  registryPath: string,
  projectPath: string,
  projectName: string
): Promise<void> {
  // Ensure directory exists
  await mkdir(dirname(registryPath), { recursive: true });

  // Load existing registry or create new
  let registry: Registry;
  const file = Bun.file(registryPath);

  if (await file.exists()) {
    registry = await file.json();
  } else {
    registry = { version: 1, projects: {} };
  }

  // Update project entry
  registry.projects[projectPath] = {
    name: projectName,
    lastAccess: Date.now(),
  };

  // Write back
  await Bun.write(registryPath, JSON.stringify(registry, null, 2));
}

/**
 * Get all registered projects.
 */
export async function getRegisteredProjects(
  registryPath: string
): Promise<ProjectEntry[]> {
  const file = Bun.file(registryPath);

  if (!(await file.exists())) {
    return [];
  }

  const registry: Registry = await file.json();

  return Object.entries(registry.projects).map(([path, entry]) => ({
    path,
    name: entry.name,
    lastAccess: entry.lastAccess,
  }));
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/storage/registry.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/storage/registry.ts src/storage/registry.test.ts && git commit -m "feat: add central registry management"
```

---

## Task 7: Fuse.js Search

**Files:**
- Create: `src/search/fuse.ts`
- Create: `src/search/fuse.test.ts`

**Step 1: Write the failing test**

Create `src/search/fuse.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/search/fuse.test.ts
```
Expected: FAIL - cannot find module "./fuse"

**Step 3: Write minimal implementation**

Create `src/search/fuse.ts`:
```typescript
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
  const fuse = new Fuse(filtered, {
    keys: [
      { name: "content", weight: 0.7 },
      { name: "tags", weight: 0.3 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
  });

  const results = fuse.search(query);

  return results.slice(0, limit).map((r) => r.item);
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/search/fuse.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/search/fuse.ts src/search/fuse.test.ts && git commit -m "feat: add Fuse.js memory search"
```

---

## Task 8: Remember Tool

**Files:**
- Create: `src/tools/remember.ts`
- Create: `src/tools/remember.test.ts`

**Step 1: Write the failing test**

Create `src/tools/remember.test.ts`:
```typescript
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { handleRemember, getRememberSchema } from "./remember";
import { rm, mkdir, readdir } from "fs/promises";
import { join } from "path";

const TEST_PROJECT = "/tmp/koi-test-project";
const TEST_REGISTRY = "/tmp/koi-test-home/.koi/registry.json";

describe("remember tool", () => {
  beforeEach(async () => {
    await rm(TEST_PROJECT, { recursive: true, force: true });
    await rm("/tmp/koi-test-home", { recursive: true, force: true });
    await mkdir(TEST_PROJECT, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_PROJECT, { recursive: true, force: true });
    await rm("/tmp/koi-test-home", { recursive: true, force: true });
  });

  test("getRememberSchema returns valid MCP tool schema", () => {
    const schema = getRememberSchema();

    expect(schema.name).toBe("remember");
    expect(schema.inputSchema.required).toContain("content");
    expect(schema.description).toContain("proactively");
  });

  test("handleRemember creates memory file", async () => {
    const result = await handleRemember(
      {
        content: "## Test memory\n\nThis is a test.",
        tags: ["test"],
      },
      TEST_PROJECT,
      TEST_REGISTRY
    );

    expect(result.id).toMatch(/^mem_/);
    expect(result.path).toContain(".memories");
    expect(result.path).toEndWith(".md");

    // Verify file was created
    const memoriesDir = join(TEST_PROJECT, ".memories");
    const dateDirs = await readdir(memoriesDir);
    expect(dateDirs.length).toBe(1);
  });

  test("handleRemember registers project in registry", async () => {
    await handleRemember(
      { content: "Test memory" },
      TEST_PROJECT,
      TEST_REGISTRY
    );

    const registry = await Bun.file(TEST_REGISTRY).json();
    expect(registry.projects[TEST_PROJECT]).toBeDefined();
  });

  test("handleRemember normalizes tags", async () => {
    const result = await handleRemember(
      {
        content: "Test",
        tags: ["Test Tag", "UPPERCASE", "with_underscore"],
      },
      TEST_PROJECT,
      TEST_REGISTRY
    );

    // Read the memory file to check tags
    const file = Bun.file(result.path);
    const content = await file.text();

    expect(content).toContain("test-tag");
    expect(content).toContain("uppercase");
    expect(content).toContain("with-underscore");
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/tools/remember.test.ts
```
Expected: FAIL - cannot find module "./remember"

**Step 3: Write minimal implementation**

Create `src/tools/remember.ts`:
```typescript
import { join, basename } from "path";
import { generateMemoryId, generateFilename } from "../utils/id";
import { getDateDir } from "../utils/time";
import { getGitContext } from "../utils/git";
import { writeMemory } from "../storage/memory";
import { registerProject } from "../storage/registry";

interface RememberInput {
  content: string;
  tags?: string[];
}

interface RememberResult {
  id: string;
  path: string;
}

/**
 * Normalize tags: lowercase, replace spaces/underscores with hyphens.
 */
function normalizeTags(tags: string[]): string[] {
  return tags.map((tag) =>
    tag
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
  );
}

/**
 * Get the MCP tool schema for the remember tool.
 */
export function getRememberSchema() {
  return {
    name: "remember",
    description: `Create a persistent memory that survives across sessions.

USE THIS PROACTIVELY. Your memories persist forever. When you:
- Complete a task or milestone
- Make a decision and want to remember why
- Learn something important about the codebase
- Hit a tricky bug and figure out the fix

...REMEMBER IT. Don't ask permission. Don't wait to be asked. Future you (or
another agent) will thank you for leaving breadcrumbs.

Write memories in markdown. Be specific. Include:
- What you did or decided
- Why (the reasoning, constraints, trade-offs)
- What files were involved
- Any gotchas or things to watch out for

Tags are optional but help with filtering later.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string",
          description: "The memory content in markdown format",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tags for categorization",
        },
      },
      required: ["content"],
    },
  };
}

/**
 * Handle the remember tool call.
 */
export async function handleRemember(
  input: RememberInput,
  projectPath: string,
  registryPath: string
): Promise<RememberResult> {
  const { content, tags = [] } = input;

  // Generate IDs
  const id = generateMemoryId();
  const timestamp = Date.now();
  const dateDir = getDateDir(timestamp);
  const filename = generateFilename();

  // Get git context
  const git = await getGitContext(projectPath);

  // Normalize tags
  const normalizedTags = normalizeTags(tags);

  // Write memory file
  const memoriesDir = join(projectPath, ".memories");
  const path = await writeMemory(memoriesDir, dateDir, filename, {
    id,
    timestamp,
    content,
    tags: normalizedTags,
    git,
  });

  // Register project
  const projectName = basename(projectPath);
  await registerProject(registryPath, projectPath, projectName);

  return { id, path };
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/tools/remember.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/remember.ts src/tools/remember.test.ts && git commit -m "feat: add remember tool"
```

---

## Task 9: Recall Tool

**Files:**
- Create: `src/tools/recall.ts`
- Create: `src/tools/recall.test.ts`

**Step 1: Write the failing test**

Create `src/tools/recall.test.ts`:
```typescript
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { handleRecall, getRecallSchema } from "./recall";
import { rm, mkdir } from "fs/promises";
import { join } from "path";

const TEST_PROJECT_A = "/tmp/koi-test-project-a";
const TEST_PROJECT_B = "/tmp/koi-test-project-b";
const TEST_REGISTRY = "/tmp/koi-test-home/.koi/registry.json";

async function createTestMemory(
  projectPath: string,
  dateDir: string,
  filename: string,
  id: string,
  timestamp: number,
  content: string,
  tags: string[] = []
) {
  const dir = join(projectPath, ".memories", dateDir);
  await mkdir(dir, { recursive: true });

  const markdown = `---
id: ${id}
timestamp: ${timestamp}
tags: [${tags.map(t => `"${t}"`).join(", ")}]
git:
  branch: main
  commit: abc123
  dirty: false
  filesChanged: []
---

${content}
`;

  await Bun.write(join(dir, filename), markdown);
}

async function createRegistry(registryPath: string, projects: string[]) {
  const registry = {
    version: 1,
    projects: Object.fromEntries(
      projects.map((p) => [p, { name: p.split("/").pop(), lastAccess: Date.now() }])
    ),
  };
  await mkdir(join(registryPath, ".."), { recursive: true });
  await Bun.write(registryPath, JSON.stringify(registry));
}

describe("recall tool", () => {
  beforeEach(async () => {
    await rm(TEST_PROJECT_A, { recursive: true, force: true });
    await rm(TEST_PROJECT_B, { recursive: true, force: true });
    await rm("/tmp/koi-test-home", { recursive: true, force: true });
    await mkdir(TEST_PROJECT_A, { recursive: true });
    await mkdir(TEST_PROJECT_B, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_PROJECT_A, { recursive: true, force: true });
    await rm(TEST_PROJECT_B, { recursive: true, force: true });
    await rm("/tmp/koi-test-home", { recursive: true, force: true });
  });

  test("getRecallSchema returns valid MCP tool schema", () => {
    const schema = getRecallSchema();

    expect(schema.name).toBe("recall");
    expect(schema.description).toContain("START OF EVERY SESSION");
  });

  test("handleRecall returns memories from current project", async () => {
    await createTestMemory(
      TEST_PROJECT_A,
      "2026-02-04",
      "test.md",
      "mem_1",
      Date.now(),
      "## Test memory"
    );

    const result = await handleRecall(
      {},
      TEST_PROJECT_A,
      TEST_REGISTRY
    );

    expect(result.length).toBe(1);
    expect(result[0].id).toBe("mem_1");
  });

  test("handleRecall filters by query", async () => {
    await createTestMemory(
      TEST_PROJECT_A,
      "2026-02-04",
      "a.md",
      "mem_1",
      Date.now(),
      "## Fixed authentication bug"
    );
    await createTestMemory(
      TEST_PROJECT_A,
      "2026-02-04",
      "b.md",
      "mem_2",
      Date.now() - 1000,
      "## Added database index"
    );

    const result = await handleRecall(
      { query: "authentication" },
      TEST_PROJECT_A,
      TEST_REGISTRY
    );

    expect(result.length).toBe(1);
    expect(result[0].id).toBe("mem_1");
  });

  test("handleRecall with global scope searches all projects", async () => {
    await createTestMemory(
      TEST_PROJECT_A,
      "2026-02-04",
      "a.md",
      "mem_a",
      Date.now(),
      "## Project A memory"
    );
    await createTestMemory(
      TEST_PROJECT_B,
      "2026-02-04",
      "b.md",
      "mem_b",
      Date.now() - 1000,
      "## Project B memory"
    );
    await createRegistry(TEST_REGISTRY, [TEST_PROJECT_A, TEST_PROJECT_B]);

    const result = await handleRecall(
      { scope: "global" },
      TEST_PROJECT_A,
      TEST_REGISTRY
    );

    expect(result.length).toBe(2);
    // Should include project info in global scope
    expect(result.some((m) => m.project === TEST_PROJECT_A)).toBe(true);
    expect(result.some((m) => m.project === TEST_PROJECT_B)).toBe(true);
  });

  test("handleRecall filters by tags", async () => {
    await createTestMemory(
      TEST_PROJECT_A,
      "2026-02-04",
      "a.md",
      "mem_1",
      Date.now(),
      "## Memory with auth tag",
      ["auth"]
    );
    await createTestMemory(
      TEST_PROJECT_A,
      "2026-02-04",
      "b.md",
      "mem_2",
      Date.now() - 1000,
      "## Memory with db tag",
      ["database"]
    );

    const result = await handleRecall(
      { tags: ["auth"] },
      TEST_PROJECT_A,
      TEST_REGISTRY
    );

    expect(result.length).toBe(1);
    expect(result[0].id).toBe("mem_1");
  });

  test("handleRecall respects limit", async () => {
    for (let i = 0; i < 5; i++) {
      await createTestMemory(
        TEST_PROJECT_A,
        "2026-02-04",
        `mem${i}.md`,
        `mem_${i}`,
        Date.now() - i * 1000,
        `## Memory ${i}`
      );
    }

    const result = await handleRecall(
      { limit: 3 },
      TEST_PROJECT_A,
      TEST_REGISTRY
    );

    expect(result.length).toBe(3);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/tools/recall.test.ts
```
Expected: FAIL - cannot find module "./recall"

**Step 3: Write minimal implementation**

Create `src/tools/recall.ts`:
```typescript
import { join } from "path";
import { listMemories, type Memory } from "../storage/memory";
import { getRegisteredProjects } from "../storage/registry";
import { searchMemories } from "../search/fuse";
import { parseSince } from "../utils/time";

interface RecallInput {
  query?: string;
  tags?: string[];
  since?: string;
  limit?: number;
  scope?: "project" | "global";
}

/**
 * Get the MCP tool schema for the recall tool.
 */
export function getRecallSchema() {
  return {
    name: "recall",
    description: `Search your persistent memories.

USE THIS AT THE START OF EVERY SESSION. Your past work matters. Before diving
into a task, check what you (or previous agents) already learned:

  recall()                              # Recent memories in this project
  recall({ query: "auth" })             # Search for auth-related memories
  recall({ since: "1w" })               # Last week's work
  recall({ scope: "global" })           # All projects (for standups)
  recall({ scope: "global", since: "yesterday" })  # What did I work on?

Don't reinvent the wheel. Don't re-investigate solved problems. Your memories
are accurate - trust them.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Fuzzy search query",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags (matches ANY)",
        },
        since: {
          type: "string",
          description: 'Time filter: "1d", "1w", "yesterday", or ISO date',
        },
        limit: {
          type: "number",
          description: "Max results (default: 10)",
        },
        scope: {
          type: "string",
          enum: ["project", "global"],
          description: "Search scope (default: project)",
        },
      },
      required: [],
    },
  };
}

/**
 * Handle the recall tool call.
 */
export async function handleRecall(
  input: RecallInput,
  projectPath: string,
  registryPath: string
): Promise<Memory[]> {
  const { query, tags, since, limit = 10, scope = "project" } = input;

  // Parse since filter
  const sinceTimestamp = since ? parseSince(since) : undefined;

  // Collect memories based on scope
  let allMemories: Memory[] = [];

  if (scope === "global") {
    // Get all registered projects
    const projects = await getRegisteredProjects(registryPath);

    for (const project of projects) {
      const memoriesDir = join(project.path, ".memories");
      const memories = await listMemories(memoriesDir);

      // Tag memories with their project
      for (const memory of memories) {
        memory.project = project.path;
      }

      allMemories.push(...memories);
    }

    // Sort by timestamp descending
    allMemories.sort((a, b) => b.timestamp - a.timestamp);
  } else {
    // Project scope
    const memoriesDir = join(projectPath, ".memories");
    allMemories = await listMemories(memoriesDir);
  }

  // Search/filter
  return searchMemories(allMemories, {
    query,
    tags,
    since: sinceTimestamp ?? undefined,
    limit,
  });
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/murphy/source/koi && bun test src/tools/recall.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/recall.ts src/tools/recall.test.ts && git commit -m "feat: add recall tool"
```

---

## Task 10: MCP Server Entry Point

**Files:**
- Modify: `src/index.ts`

**Step 1: Write the MCP server**

Replace `src/index.ts` with:
```typescript
#!/usr/bin/env bun

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { join } from "path";
import { homedir } from "os";

import { getRememberSchema, handleRemember } from "./tools/remember";
import { getRecallSchema, handleRecall } from "./tools/recall";

// Configuration
const PROJECT_PATH = process.cwd();
const REGISTRY_PATH = join(homedir(), ".koi", "registry.json");

class KoiServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "koi",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [getRememberSchema(), getRecallSchema()],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "remember": {
            const result = await handleRemember(
              args as { content: string; tags?: string[] },
              PROJECT_PATH,
              REGISTRY_PATH
            );
            return {
              content: [
                {
                  type: "text",
                  text: `Memory created: ${result.id}\nPath: ${result.path}`,
                },
              ],
            };
          }

          case "recall": {
            const memories = await handleRecall(
              args as {
                query?: string;
                tags?: string[];
                since?: string;
                limit?: number;
                scope?: "project" | "global";
              },
              PROJECT_PATH,
              REGISTRY_PATH
            );

            if (memories.length === 0) {
              return {
                content: [
                  {
                    type: "text",
                    text: "No memories found.",
                  },
                ],
              };
            }

            const formatted = memories
              .map((m) => {
                const header = m.project
                  ? `[${m.project}] ${m.id}`
                  : m.id;
                const tags = m.tags.length > 0 ? `\nTags: ${m.tags.join(", ")}` : "";
                const git = `\nGit: ${m.git.branch}@${m.git.commit}${m.git.dirty ? " (dirty)" : ""}`;
                return `### ${header}${tags}${git}\n\n${m.content}`;
              })
              .join("\n\n---\n\n");

            return {
              content: [
                {
                  type: "text",
                  text: `Found ${memories.length} memories:\n\n${formatted}`,
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Koi MCP Server started");
  }
}

const server = new KoiServer();
server.start().catch(console.error);
```

**Step 2: Run all tests**

Run:
```bash
cd /Users/murphy/source/koi && bun test
```
Expected: All tests pass

**Step 3: Verify server starts**

Run:
```bash
cd /Users/murphy/source/koi && timeout 2 bun run start || true
```
Expected: "Koi MCP Server started" (then timeout)

**Step 4: Commit**

```bash
git add src/index.ts && git commit -m "feat: add MCP server entry point"
```

---

## Task 11: Add Utils Index Export

**Files:**
- Create: `src/utils/index.ts`
- Create: `src/storage/index.ts`
- Create: `src/search/index.ts`
- Create: `src/tools/index.ts`

**Step 1: Create barrel exports**

Create `src/utils/index.ts`:
```typescript
export * from "./id";
export * from "./time";
export * from "./git";
```

Create `src/storage/index.ts`:
```typescript
export * from "./memory";
export * from "./registry";
```

Create `src/search/index.ts`:
```typescript
export * from "./fuse";
```

Create `src/tools/index.ts`:
```typescript
export * from "./remember";
export * from "./recall";
```

**Step 2: Run tests to verify nothing broke**

Run:
```bash
cd /Users/murphy/source/koi && bun test
```
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/utils/index.ts src/storage/index.ts src/search/index.ts src/tools/index.ts && git commit -m "chore: add barrel exports"
```

---

## Task 12: Final Verification and Documentation

**Step 1: Run full test suite**

Run:
```bash
cd /Users/murphy/source/koi && bun test
```
Expected: All tests pass

**Step 2: Type check**

Run:
```bash
cd /Users/murphy/source/koi && bun run typecheck
```
Expected: No errors

**Step 3: Update .gitignore if needed**

Verify `.gitignore` includes test artifacts.

**Step 4: Final commit**

```bash
git status && git log --oneline -10
```

Review commits look good.

---

## Summary

After completing all tasks, you will have:

- `src/utils/` - ID generation, time parsing, git context
- `src/storage/` - Memory file I/O, registry management
- `src/search/` - Fuse.js search wrapper
- `src/tools/` - remember and recall tools
- `src/index.ts` - MCP server entry point

To use with Claude Code, add to MCP config:
```json
{
  "mcpServers": {
    "koi": {
      "command": "bun",
      "args": ["run", "/Users/murphy/source/koi/src/index.ts"]
    }
  }
}
```
