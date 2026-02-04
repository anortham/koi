# Koi Memory System - Agent Instructions

You have access to a persistent memory system. Your memories survive across sessions, context compactions, and even different agents working on the same project.

## Critical Rules (Non-Negotiable)

I WILL BE SERIOUSLY DISAPPOINTED IF YOU DON'T FOLLOW THESE RULES.

### Rule 1: Recall at Session Start

**Every session MUST start with `recall()`.** No exceptions. No asking permission.

```javascript
recall()                              // FIRST action in EVERY session
recall({ query: "relevant topic" })   // If you know what you're working on
```

Before diving into ANY task, check what you (or previous agents) already learned. Don't reinvent the wheel. Don't re-investigate solved problems.

### Rule 2: Remember Proactively

**NEVER ask "should I save this?"** - the answer is ALWAYS YES.

Create memories immediately after:
- Completing a task or milestone
- Making a decision (especially the WHY)
- Learning something important about the codebase
- Hitting a tricky bug and figuring out the fix
- Discovering gotchas or edge cases

Future you (or another agent) will thank you for leaving breadcrumbs.

### Rule 3: Trust Your Memories

Your memories are accurate and complete. Do NOT:
- Re-read files to "verify" what a memory says
- Re-investigate problems that memories already explain
- Ask the user to confirm what's in your memories

If a memory says "the bug was caused by X", trust it and move on.

## The Golden Rule

| Instead of... | Do this... | Why? |
|---------------|------------|------|
| Re-investigating old bugs | `recall({ query: "bug" })` | Memories have the answer |
| Asking "what did we decide?" | `recall({ query: "decision" })` | Decisions are recorded |
| Starting fresh each session | `recall()` first | Context persists |
| Hoping you'll remember later | `remember()` NOW | Memories are permanent |

## Memory Format

Write memories in markdown. Be specific. Include:

```markdown
## What I Did/Decided
[Clear description of the action or decision]

### Why
[The reasoning, constraints, trade-offs that led to this]

### Files Involved
- `path/to/file.ts` - what was changed/relevant

### Gotchas
- Any edge cases or things to watch out for
```

Rich, structured descriptions surface better in semantic search than thin one-liners.

## Common Mistakes

### Forgetting to recall at session start
- ❌ Jump straight into the task
- ✅ `recall()` FIRST, then work

### Not remembering decisions
- ❌ Make a decision, move on, forget why
- ✅ `remember()` the decision AND the reasoning

### Asking permission to remember
- ❌ "Should I save this to memory?"
- ✅ Just do it. The answer is always yes.

### Thin memories
- ❌ "Fixed the bug"
- ✅ "Fixed auth bug - the token was being checked before refresh, added null check in `src/auth.ts:42`"

## Workflow Patterns

### Starting a Session
```javascript
// 1. ALWAYS first
recall()

// 2. Check for relevant context
recall({ query: "current task" })
recall({ tags: ["in-progress"] })

// 3. Then proceed with work
```

### Completing Work
```javascript
// After ANY significant progress
remember({
  content: `## Completed: [Task]

### What
[Description]

### Key Changes
- file1.ts: [what changed]
- file2.ts: [what changed]

### Decisions Made
- Chose X over Y because [reason]`,
  tags: ["milestone", "feature-name"]
})
```

### Cross-Project Context
```javascript
// For standups or understanding overall progress
recall({ scope: "global", since: "yesterday" })
recall({ scope: "global", since: "1w" })
```

## Quick Reference

```javascript
// Session start (MANDATORY)
recall()

// Search memories
recall({ query: "authentication" })
recall({ tags: ["bug", "auth"] })
recall({ since: "1w" })
recall({ scope: "global" })

// Create memory (DO IT NOW)
remember({
  content: "## Title\n\nDetails...",
  tags: ["optional", "tags"]
})
```

---

**Remember: Your memories are your professional advantage. Use them.**
