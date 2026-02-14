# copus:review — Difficulty-Attributed Code Review

Smart review of code changes with machine-readable findings, difficulty attribution, and MiniMax routing hints. Produces both human-readable report AND structured JSON for copus:fix.

## Arguments

- `[scope]` — Optional: "staged", "branch", file path, or PR URL. Default: staged changes.
- `"focus"` — Optional: focus area (e.g. "security", "performance", "types").

## Protocol

### Step 1: Identify Scope

Determine what to review based on arguments:
- No args: `git diff --cached` (staged changes)
- `"staged"`: `git diff --cached`
- `"branch"`: `git diff main...HEAD`
- File path: read that file
- PR URL: fetch PR diff via `gh`

If no changes found, tell the user and stop.

### Step 2: Read Changed Files

For each changed file, read the FULL current file content (not just the diff). You need surrounding context to assess quality.

### Step 3: Review Categories

Evaluate changes across these categories:

1. **Security**: Injection, auth bypass, secrets exposure, unsafe input handling
2. **Correctness**: Logic errors, off-by-one, null handling, race conditions, type safety
3. **Performance**: N+1 queries, unbounded loops, blocking operations, memory leaks
4. **Architecture**: Separation of concerns, coupling, API design, naming
5. **Quality**: Error handling, edge cases, readability, test coverage gaps

### Step 4: Assign Difficulty to Each Finding

For every finding, assign a difficulty level:

| Level | Criteria | Route |
|-------|----------|-------|
| **trivial** | One-line change, typo, formatting, missing comma/semicolon | MiniMax |
| **easy** | Single-file fix, mechanical (null check, type annotation, import fix) | MiniMax |
| **medium** | Multi-file but formulaic (rename across files, add field to type + all usages) | MiniMax |
| **hard** | Requires understanding context (refactor, fix race condition, optimize query) | Opus |
| **very_hard** | Architecture decision, security redesign, breaking change | Opus |

**When in doubt, round UP** (easy -> medium, not easy -> trivial).

### Step 5: Generate Fix Instructions

For each finding:
- **trivial/easy/medium**: MUST provide exact `old_string` and `new_string` for the Edit tool. `old_string` must be unique in the file — include enough surrounding context lines to ensure uniqueness.
- **hard/very_hard**: Provide `fix_instruction` text only (no old_string/new_string). These require Opus to reason about the fix.

### Step 6: Report

Output a human-readable report:

```
## Review: [scope description]

### Security
- [findings or "No issues found"]

### Correctness
- [findings]

### Performance
- [findings]

### Architecture
- [findings]

### Quality
- [findings]

### Summary
- Total findings: N
- Critical: X | Warning: Y | Info: Z
- MiniMax-eligible (trivial+easy+medium): A
- Opus-required (hard+very_hard): B

### Next Step
Run `/copus:fix` to apply fixes, or `/copus:fix "F1 F3"` for specific findings.
```

### Step 7: Machine-Readable Findings Block

IMMEDIATELY after the human-readable report, output this structured block:

<!-- COPUS:FINDINGS:START -->
```json
{
  "findings": [
    {
      "id": "F1",
      "severity": "CRITICAL|WARNING|INFO",
      "category": "security|correctness|performance|architecture|quality",
      "difficulty": "trivial|easy|medium|hard|very_hard",
      "file": "path/to/file.ts",
      "line": 42,
      "description": "Clear description of the issue",
      "fix_instruction": "How to fix it (always present)",
      "fix": {
        "old_string": "exact text to find in file (unique)",
        "new_string": "replacement text"
      }
    },
    {
      "id": "F2",
      "severity": "WARNING",
      "category": "performance",
      "difficulty": "hard",
      "file": "path/to/other.ts",
      "line": 88,
      "description": "N+1 query pattern",
      "fix_instruction": "Batch the queries using Promise.all",
      "fix": null
    }
  ],
  "summary": {
    "total": 2,
    "by_severity": { "critical": 1, "warning": 1, "info": 0 },
    "by_difficulty": { "trivial": 0, "easy": 1, "medium": 0, "hard": 1, "very_hard": 0 },
    "minimax_eligible": 1,
    "opus_required": 1
  }
}
```
<!-- COPUS:FINDINGS:END -->

## Rules

- The JSON block MUST be valid JSON — no trailing commas, no comments
- `fix.old_string` MUST be unique in the target file (same rule as the Edit tool)
- `fix` is `null` for hard/very_hard findings — only `fix_instruction` is provided
- `fix` MUST be present (with old_string + new_string) for trivial/easy/medium findings
- Finding IDs are sequential: F1, F2, F3...
- One finding per distinct issue (don't combine multiple issues)
- Summary counts must match the findings array
- Include both the human report AND the JSON block — copus:fix parses the JSON, humans read the report

## MiniMax Pre-Scan (Optional)

If `mcp__llm-swarm__llm_batch` is available AND the diff touches 5+ files:

1. Read all changed files
2. Fan out to MiniMax with parallel prompts:
   ```
   For each file, send:
   "Review this file for bugs, security issues, and code quality problems.
    File: {path}
    Content: {content}
    Return a JSON array of issues: [{line, severity, description}]"
   ```
3. Merge MiniMax pre-scan results with your own analysis
4. MiniMax finds patterns; YOU make severity/difficulty decisions

If `mcp__llm-swarm__llm_batch` is unavailable, skip this step entirely (graceful degradation).
