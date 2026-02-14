# copus:phase — Execute One Phase of a Plan

Execute ONE specific phase/task from a plan file. Prevents context exhaustion by scoping execution to a single logical unit. Uses MiniMax routing when the task difficulty allows it.

## Arguments

- `plan_file` — Path to plan file. Required.
- `"T3"` or `"phase 3"` — Which task to execute. Required.

## Protocol

### Step 1: Read the Plan

1. Read the plan file
2. Find the specified task (T1, T2, etc.)
3. Check dependencies — if this task depends on incomplete tasks, warn the user
4. Display: "Executing T{N}: {title} (difficulty: {level}, route: {route})"

### Step 2: Execute Based on Route

**If route is MiniMax (trivial/easy/medium) AND `mcp__llm-swarm__llm_batch` is available:**

1. Read all files referenced in the task
2. Send implementation prompt to `llm_batch` (same format as copus:implement Step 2)
3. Parse response as JSON edit array
4. Validate and apply edits
5. If invalid, fall back to Opus execution

**If route is Opus (hard/very_hard) OR MiniMax unavailable:**

1. Read all referenced files
2. Implement with full context and reasoning
3. Typecheck after each file change
4. Fix errors immediately

### Step 3: Validate

1. Run typecheck
2. Run tests relevant to this phase
3. Report results

### Step 4: Commit

If validation passes, commit with conventional message referencing the task ID.

### Step 5: Handoff

```
Phase T{N} complete. Next:
/copus:phase plan.md "T{N+1}"
```

## Rules

- Execute ONE task only — do not proceed to the next task
- Typecheck after every file change
- If MiniMax fails, fall back to Opus (graceful degradation)
- Commit after successful validation
