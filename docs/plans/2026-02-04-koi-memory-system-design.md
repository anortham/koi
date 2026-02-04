# Koi Memory System Design

A lean MCP server for agent memory persistence across sessions.

## Problem

Agents lose context when sessions end, context windows fill, or crashes occur. This leads to:
- Repeated work discovering the same information
- Lost decisions and their rationale
- No continuity across sessions
- Difficulty generating standups or progress reports

## Goals

1. Agents create memories at milestones unprompted
2. Agents recover context when resuming work
3. Searchable history of decisions and rationale (not just what changed, but why)
4. Cross-project timeline for standups and reports

## Non-Goals

- Replacing git history (git tracks what, koi tracks why)
- Complex categorization schemes
- Real-time sync between machines
- Team collaboration features (memories are local)

---

## Architecture

### Storage Model

```
project-root/
└── .memories/
    ├── 2026-02-04/
    │   ├── 143052_a1b2.md
    │   └── 161830_c3d4.md
    └── 2026-02-03/
        └── 091245_e5f6.md

~/.koi/
└── registry.json    # Tracks all project paths with memories
```

**Why project-local?**
- Version-controlled with the code
- Visible to teammates browsing the repo
- Discoverable without special tooling

**Why a central registry?**
- Enables cross-project queries without filesystem scanning
- Simple JSON file, updated on `remember` calls
- Stale entries are harmless (skipped if `.memories/` doesn't exist)

### Memory Format

Markdown with YAML frontmatter - human-readable, git-friendly diffs, agents write markdown naturally.

```markdown
---
id: mem_a1b2c3d4e5f6
timestamp: 1738680652
tags:
  - auth
  - architecture
git:
  branch: feature/oauth
  commit: abc1234
  dirty: true
  files_changed:
    - src/auth/oauth.ts
    - src/middleware/session.ts
---

## Chose OAuth2 over JWT for session management

### Context
Needed stateless auth but also wanted token revocation capability.

### Decision
OAuth2 with refresh tokens stored server-side. Access tokens are short-lived (15min),
refresh tokens in Redis with explicit revocation support.

### Trade-offs
- More server state than pure JWT
- But: can revoke sessions instantly (security requirement)
- Redis adds infrastructure, but we already use it for caching
```

### Registry Format

```json
{
  "version": 1,
  "projects": {
    "/Users/murphy/source/koi": {
      "lastAccess": 1738680652,
      "name": "koi"
    },
    "/Users/murphy/source/miller": {
      "lastAccess": 1738670000,
      "name": "miller"
    }
  }
}
```

---

## Tools

### `remember`

Create a memory. Agents should call this proactively at milestones.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `content` | string | yes | Markdown content - the memory itself |
| `tags` | string[] | no | Optional tags for filtering |

#### Returns

```typescript
{
  id: string,       // e.g., "mem_a1b2c3d4e5f6"
  path: string      // e.g., ".memories/2026-02-04/143052_a1b2.md"
}
```

#### Auto-captured

- Timestamp (Unix seconds)
- Git context: branch, commit (short), dirty status, changed files
- Project path (registered in `~/.koi/registry.json`)

#### Tool Description (for LLM)

```
Create a persistent memory that survives across sessions.

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

Tags are optional but help with filtering later.
```

### `recall`

Search and retrieve memories.

#### Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `query` | string | no | - | Fuzzy text search via Fuse.js |
| `tags` | string[] | no | - | Filter to memories with ANY of these tags |
| `since` | string | no | - | Time filter: "1d", "1w", "yesterday", or ISO date |
| `limit` | number | no | 10 | Max results to return |
| `scope` | string | no | "project" | "project" or "global" |

#### Returns

```typescript
Array<{
  id: string,
  timestamp: number,
  tags: string[],
  content: string,      // The markdown body
  git: {
    branch: string,
    commit: string,
    dirty: boolean,
    files_changed: string[]
  },
  project?: string      // Only in global scope
}>
```

#### Tool Description (for LLM)

```
Search your persistent memories.

USE THIS AT THE START OF EVERY SESSION. Your past work matters. Before diving
into a task, check what you (or previous agents) already learned:

  recall()                              # Recent memories in this project
  recall({ query: "auth" })             # Search for auth-related memories
  recall({ since: "1w" })               # Last week's work
  recall({ scope: "global" })           # All projects (for standups)
  recall({ scope: "global", since: "yesterday" })  # What did I work on?

Don't reinvent the wheel. Don't re-investigate solved problems. Your memories
are accurate - trust them.
```

---

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Bun | Fast startup (matters for MCP), native TypeScript |
| MCP Framework | @modelcontextprotocol/sdk | Official, well-documented |
| Search | Fuse.js | Proven fuzzy search, good enough for <10k memories |
| Storage | Filesystem (markdown) | Simple, human-readable, git-friendly |
| Registry | JSON file | Simple, no dependencies |

### Future Considerations

- **Embeddings**: If fuzzy search proves insufficient for semantic queries ("find memories about performance issues" not matching "fixed N+1 query"), add optional vector embeddings with LanceDB
- **Timeline tool**: If `recall({ scope: "global" })` is awkward for standups, add dedicated `timeline` tool with structured output

---

## File Structure

```
koi/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── tools/
│   │   ├── remember.ts    # remember tool implementation
│   │   └── recall.ts      # recall tool implementation
│   ├── storage/
│   │   ├── memory.ts      # Read/write memory files
│   │   └── registry.ts    # Central registry management
│   ├── search/
│   │   └── fuse.ts        # Fuse.js search wrapper
│   └── utils/
│       ├── git.ts         # Git context capture
│       ├── id.ts          # ID generation
│       └── time.ts        # Time parsing utilities
├── package.json
├── tsconfig.json
└── docs/
    └── plans/
        └── 2026-02-04-koi-memory-system-design.md
```

---

## Implementation Plan

### Phase 1: Core Infrastructure
1. Initialize Bun project with MCP SDK
2. Implement memory file read/write (markdown + frontmatter)
3. Implement registry management
4. Implement git context capture

### Phase 2: Tools
5. Implement `remember` tool
6. Implement `recall` tool with Fuse.js search
7. Add time filtering and tag filtering

### Phase 3: Polish
8. Write tool descriptions that encourage proactive usage
9. Test with Claude Code
10. Add to MCP config

---

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Where to store memories? | Project-local `.memories/` with central registry |
| What format? | Markdown + YAML frontmatter |
| How to search? | Fuse.js (embeddings later if needed) |
| Memory types/categories? | None - tags handle this organically |
| Forget/delete tool? | No - memories accumulate, search filters |
| Separate timeline tool? | No - use `recall({ scope: "global" })` |
