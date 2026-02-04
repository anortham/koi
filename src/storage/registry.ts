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
