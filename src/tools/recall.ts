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
