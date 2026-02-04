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
