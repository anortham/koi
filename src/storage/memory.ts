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
