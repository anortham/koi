# koi

A Claude Code plugin for agent memory persistence. Memories survive across sessions, enabling agents to build on previous work instead of starting fresh.

## Features

- **remember** - Create persistent memories with optional tags
- **recall** - Search memories with fuzzy matching, tag filtering, time ranges, and cross-project queries
- **SessionStart hook** - Reminds agents to check memories at the start of each session
- **PreCompact hook** - Reminds agents to save progress before context is lost
- **Standup skill** - Generate formatted timeline reports with `/koi:standup`

## Installation

Requires [Bun](https://bun.sh).

### As a Plugin (Recommended)

In Claude Code:

```
/plugin marketplace add github:anortham/koi
/plugin install koi@koi
```

### Manual Installation

```bash
git clone https://github.com/anortham/koi.git
cd koi
bun install
claude mcp add koi /path/to/koi/src/index.ts
```

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

### Standup Reports

When installed as a plugin, use `/koi:standup` or ask "What did I work on yesterday?"

## Hooks

Koi includes hooks that fire automatically:

- **SessionStart** - On new/resumed sessions, reminds the agent to check memories
- **PreCompact** - Before context compaction, reminds the agent to save progress

## License

MIT
