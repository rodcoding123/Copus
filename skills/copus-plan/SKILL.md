# copus:plan — Difficulty-Attributed Implementation Planning

Design an implementation approach with difficulty levels and MiniMax routing hints for every task. Outputs a structured plan file that copus:implement can parse for automated routing.

## Arguments

- `"task"` — What to build/change (required)
- `"constraints"` — Optional constraints, tech choices, or requirements

## Protocol

### Step 1: Understand the Request

Read the task description and any referenced files, issues, or docs. If unclear, ask 1-2 clarifying questions before proceeding.

### Step 2: Explore the Codebase

Find the relevant modules, patterns, and conventions:
- Use Glob to find related files
- Use Grep to find similar patterns
- Read key files to understand architecture
- Identify dependencies and potential conflicts

### Step 3: Design the Approach

Break the work into discrete tasks (T1, T2, T3...). For each task:
1. Determine which files are affected
2. Describe what changes are needed
3. Assign a difficulty level
4. Assign a route (MiniMax or Opus)
5. Identify dependencies on other tasks

### Step 4: Write the Plan File

Output a structured plan file. Save it to the location specified by the user, or default to `docs/plans/{kebab-case-name}.md`.

```markdown
# Plan: [Title]

Created: [date]
Status: Ready for /copus:implement

## Goal
[1-2 sentence description]

## Constraints
[Bullet list of constraints]

## Tasks

### T1: [Task name] (difficulty: [level], route: [minimax|opus])

- **Files**: [list of files to modify/create]
- **What**: [description of changes]
- **Route**: [MiniMax|Opus] — [why this routing]
- **Depends on**: [other task IDs, or "none"]

### T2: [Task name] (difficulty: [level], route: [minimax|opus])
...

## Execution Order

T1 → T2 → T3 (T4 + T5 in parallel) → T6

## Routing Summary

| Difficulty | Tasks | Route |
|-----------|-------|-------|
| trivial | N | MiniMax |
| easy | N | MiniMax |
| medium | N | MiniMax |
| hard | N | Opus |
| very_hard | N | Opus |

MiniMax tasks: X (~$Y.YY estimated)
Opus tasks: Z
```

### Step 5: Difficulty Assignment Criteria

| Level | Criteria | Route |
|-------|----------|-------|
| **trivial** | One-line change, typo, formatting | MiniMax |
| **easy** | Single-file, mechanical, clear instructions | MiniMax |
| **medium** | Multi-file but formulaic, pattern-based | MiniMax |
| **hard** | Requires understanding context, trade-offs | Opus |
| **very_hard** | Architecture decision, security-critical | Opus |

Consider these factors:
- **File count**: 1 file = likely easy, 3+ files with logic = likely hard
- **Decision complexity**: Mechanical edit = easy, design choice = hard
- **Security impact**: Any security change = at least medium, redesign = very_hard
- **Context needed**: Can fix with just the file content? = easy. Need to understand the whole module? = hard.

**When in doubt, round UP** (medium -> hard, not medium -> easy).

### Step 6: Cost Estimation

For MiniMax tasks, estimate token usage:
- Simple file read + edit: ~2K input, ~500 output = ~$0.0009
- Multi-file scan: ~5K input, ~1K output = ~$0.002
- Use these to compute the "MiniMax tasks" cost in the Routing Summary

### Step 7: Handoff

After writing the plan, output:

```
Next step:
/copus:implement docs/plans/{plan-file}.md
```

## MiniMax Parallel Exploration (Optional)

If `mcp__llm-swarm__llm_batch` is available AND the task touches 4+ modules:

1. Identify the key files to explore
2. Fan out to MiniMax:
   ```
   For each module, send:
   "Analyze this module for the task: {task_description}
    File: {path}
    Content: {content}
    Return: key functions, dependencies, potential conflicts, and integration points."
   ```
3. Use MiniMax responses to inform your task breakdown
4. You make all architecture decisions — MiniMax just does the reading

If `mcp__llm-swarm__llm_batch` is unavailable, explore manually (graceful degradation).

## Rules

- Every task MUST have a difficulty level and route
- Tasks should be small enough to complete in one logical unit
- Execution order must respect dependencies
- Routing Summary must have accurate counts matching the task list
- Plan file must be self-contained — anyone can read it and understand the work
- No project-specific references (no THANOS_MODE, no OpenClaw, no Helix)
- Use generic quality commands: "run your project's typecheck/test/lint command"
