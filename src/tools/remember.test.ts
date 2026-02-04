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
