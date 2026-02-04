# koi

A lean MCP server for agent memory persistence. Memories survive across sessions, enabling agents to build on previous work instead of starting fresh.

## Features

- **remember** - Create persistent memories with optional tags
- **recall** - Search memories with fuzzy matching, tag filtering, time ranges, and cross-project queries

## Installation

Requires [Bun](https://bun.sh).

```bash
# Clone the repository
git clone https://github.com/anortham/koi.git
cd koi

# Install dependencies
bun install

# Add to Claude Code
claude mcp add koi /path/to/koi/src/index.ts
```

Replace `/path/to/koi` with the actual path where you cloned the repository.

## Storage

Memories are stored as markdown files with YAML frontmatter in a `.memories/` folder within each project:

```
.memories/
└── 2026-02-04/
    └── 134602_bdbc.md
```

A central registry at `~/.koi/registry.json` enables cross-project queries via the `scope: "global"` option.

## Usage

### remember

```javascript
{
  content: "## What I learned\n\nThe auth system uses JWT tokens stored in...",
  tags: ["auth", "investigation"]
}
```

### recall

```javascript
// Recent memories in current project
{}

// Search with query
{ query: "auth" }

// Filter by tags
{ tags: ["bug", "fix"] }

// Time-based filtering
{ since: "1d" }      // last day
{ since: "1w" }      // last week
{ since: "yesterday" }

// Cross-project search
{ scope: "global" }

// Combine filters
{ query: "database", tags: ["migration"], since: "1w", limit: 5 }
```

## License

MIT
