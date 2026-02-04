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

Use this proactively. Your memories persist forever. When you:
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

Tags are optional but help with filtering later.

IMPORTANT: Professional developers maintain session continuity. Every significant
action deserves a memory. If you're wondering "should I remember this?" - YES.
The answer is always yes. A thin memory is better than no memory, but a rich
markdown memory with context, reasoning, and file paths is what separates
excellent agents from mediocre ones.`,
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
