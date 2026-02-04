---
name: standup
description: Use when user asks for a standup, daily summary, weekly report, or "what did I work on" - requires koi MCP server
---

# Standup Timeline

Generate formatted standup reports from koi memories.

## When to Use

- "What did I work on yesterday/this week?"
- Standup or daily summary requests
- Progress reports across projects

## The Technique

### 1. Recall with global scope

Always use `scope: "global"` for standups - work spans projects:

```javascript
recall({ scope: "global", since: "yesterday" })  // daily standup
recall({ scope: "global", since: "1w" })         // weekly report
```

### 2. Format output

```markdown
## Standup - [Date]

### [project-name]
- Completed X [`mem_abc123`]
- Fixed Y [`mem_def456`]

### [other-project]
- Implemented Z [`mem_ghi789`]
```

**Rules:**
- Group by project
- One bullet per memory (summarize to single line)
- Include memory ID in backticks for traceability
- Only report what's in memories - no speculation

### 3. Time filters

| Request | Since value |
|---------|-------------|
| Today | `"today"` |
| Yesterday | `"yesterday"` |
| Last N days | `"Nd"` (e.g., `"3d"`) |
| Last week | `"1w"` |
| Specific date | ISO date string |

## Common Mistakes

**Speculating about future work**
- Only report what's in memories
- Don't add "Today: ..." sections based on guessing

**Missing memory IDs**
- Always include IDs so user can dig deeper with `recall({ query: "mem_xxx" })`

**Forgetting global scope**
- Default scope is project-only
- Standups need cross-project view
