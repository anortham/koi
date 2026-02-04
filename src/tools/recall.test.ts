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
