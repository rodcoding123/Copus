# copus:implement — Difficulty-Routed Implementation

Execute a plan file with automatic MiniMax routing for easy/medium tasks and Opus for hard/very_hard tasks. Reads existing code before writing, validates after every change.

## Arguments

- `plan_file` — Path to a plan file (from copus:plan). Required.
- `"focus"` — Optional: focus on specific tasks (e.g. "T1-T3", "T5 only").

## Protocol

### Step 0: Read the Plan

1. Read the plan file completely
2. Parse all tasks with their difficulty/route assignments
3. If focus argument provided, filter to those tasks only
4. Display route analysis:
   ```
   Plan: [title]
   Tasks: N total — X for MiniMax (trivial+easy+medium), Y for Opus (hard+very_hard)
   Execution order: T1 → T2 → (T3 + T4) → T5
   ```

### Step 1: Checkpoint

Summarize your approach in 3 bullets:
1. Architecture approach
2. Key files to modify
3. Validation strategy

Wait for user confirmation before proceeding. Adjust based on feedback.

### Step 2: Execute MiniMax Tasks First

For each MiniMax-eligible task (trivial/easy/medium), if `mcp__llm-swarm__llm_batch` is available:

1. Read ALL files referenced in the task
2. Construct implementation prompts for `llm_batch`:
   ```json
   {
     "id": "T3-implement",
     "prompt": "Implement this change to the given file.\n\n## Task\n{task_description}\n\n## File: {file_path}\n```\n{file_content}\n```\n\n## Instructions\n{what_to_do}\n\n## Return Format\nReturn ONLY a JSON array of edits:\n[{\"old_string\": \"exact text to find\", \"new_string\": \"replacement text\"}]\nNo explanations, no markdown fences, just the raw JSON array.",
     "system": "You are a precise code editor. Return only valid JSON arrays of string replacements. Each old_string must be unique in the file."
   }
   ```
3. Parse MiniMax responses as JSON edit arrays
4. Validate each response:
   - Must be valid JSON array
   - Each item must have `old_string` and `new_string`
   - `old_string` must exist in the file content
5. Apply valid edits using the Edit tool
6. Run typecheck after each task
7. If typecheck fails: undo the edits (re-read original file), move task to Opus queue

**If `mcp__llm-swarm__llm_batch` is unavailable**: Execute ALL tasks via Opus (Step 3). This is graceful degradation — the plan still works, just without cost savings.

### Step 3: Execute Opus Tasks

For each hard/very_hard task (and any escalated from Step 2):
1. Read all referenced files
2. Implement the change with full context and reasoning
3. Run typecheck after each file change
4. Fix type errors immediately before proceeding
5. Run relevant tests after each task

### Step 4: Full Validation

After all tasks complete:
1. Run full typecheck
2. Run full test suite
3. If failures: investigate and fix. Do NOT skip validation.

### Step 5: Report

```markdown
## Implementation Report

| Task | Difficulty | Route | Status | Notes |
|------|-----------|-------|--------|-------|
| T1 | easy | MiniMax | Done | 2 edits applied |
| T2 | hard | Opus | Done | Refactored module |
| T3 | medium | MiniMax → Opus | Done | Escalated: invalid JSON |

### Summary
- Completed: X/Y tasks
- MiniMax: N tasks ($0.XXXX)
- Opus: M tasks
- Escalated: K tasks (MiniMax → Opus)
- Quality gates: typecheck [PASS/FAIL] | tests [PASS/FAIL]
```

### Step 6: Commit

If all quality gates pass, commit with a conventional commit message.

## Rules

- ALWAYS read existing code before writing — never fabricate
- ALWAYS typecheck after every file change
- If MiniMax returns invalid JSON, escalate to Opus — do NOT retry MiniMax
- If MiniMax edit's `old_string` doesn't exist in file, escalate to Opus
- Respect task execution order and dependencies from the plan
- One commit per completed logical phase (not per task)
- No project-specific references in this skill (no THANOS_MODE, no OpenClaw)
- Use generic commands: "run your project's typecheck/test command"
