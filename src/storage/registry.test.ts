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
