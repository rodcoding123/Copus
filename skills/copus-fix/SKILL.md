# copus:fix — Apply Review Findings with MiniMax Labor Routing

Consume findings from copus:review and apply fixes. Routes mechanical edits (trivial/easy/medium) to MiniMax for verification, keeps complex fixes (hard/very_hard) for Opus. Gracefully degrades to Opus-only when MiniMax is unavailable.

## Arguments

- No args: apply ALL findings from the most recent copus:review
- `"F1 F3 F5"`: apply only specific finding IDs
- `"all"`: same as no args — apply everything

## Protocol

### Step 1: Parse Findings

1. Look for the `<!-- COPUS:FINDINGS:START -->` block in conversation context
2. Parse the JSON findings array
3. If no findings block found, tell the user:
   ```
   No review findings found in context. Run /copus:review first, then /copus:fix.
   ```
4. If specific IDs requested, filter to only those findings
5. Display summary:
   ```
   Found N findings: X MiniMax-eligible (trivial+easy+medium), Y Opus-required (hard+very_hard)
   ```

### Step 2: Route by Difficulty

Split findings into two groups:
- **MiniMax batch** (trivial + easy + medium): Have exact `old_string`/`new_string`
- **Opus queue** (hard + very_hard): Need contextual understanding, only have `fix_instruction`

### Step 3: Execute MiniMax Batch

If MiniMax batch is non-empty AND `mcp__llm-swarm__llm_batch` is available:

1. Read the content of each file referenced in MiniMax-batch findings
2. For each finding with `fix.old_string`/`fix.new_string`, construct a verification prompt:
   ```json
   {
     "id": "verify-F1",
     "prompt": "Verify this code edit is correct and safe.\n\nFile: {file_path}\nFile content:\n```\n{file_content}\n```\n\nProposed edit:\n  OLD: {old_string}\n  NEW: {new_string}\n\nContext: {description}\n\nRespond with ONLY one of:\n- SAFE\n- UNSAFE: [reason]",
     "system": "You are a code safety verifier. Check that the old_string exists in the file, the replacement is syntactically valid, and the edit doesn't introduce bugs. Be conservative — if unsure, say UNSAFE."
   }
   ```
3. Call `mcp__llm-swarm__llm_batch` with all verification prompts
4. For each response:
   - If "SAFE": Apply the edit using the Edit tool (`old_string` -> `new_string`)
   - If "UNSAFE: reason": Move to Opus queue with the safety concern noted
   - If parse error: Move to Opus queue

**If `mcp__llm-swarm__llm_batch` is unavailable**: Skip MiniMax verification. For trivial/easy findings that have `old_string`/`new_string`, apply them directly (you can verify safety yourself). For medium findings, verify before applying.

### Step 4: Execute Opus Queue

For each hard/very_hard finding (and any escalated from Step 3):
1. Read the full file
2. Understand the surrounding context
3. Apply the fix based on `fix_instruction`
4. Run typecheck after each fix: `npm run typecheck` (or project-specific command)
5. If typecheck fails, fix the type error before proceeding

### Step 5: Validate

After all fixes applied:
1. Run typecheck (or project-specific equivalent)
2. Run tests (or project-specific equivalent)
3. If failures occur, attempt to fix them. If you can't, report which fixes caused the failure.

### Step 6: Report

```markdown
## Fix Report

| ID | Severity | Difficulty | Route | Status | Notes |
|----|----------|------------|-------|--------|-------|
| F1 | CRITICAL | easy | MiniMax | Applied | Verified safe |
| F2 | WARNING | hard | Opus | Applied | Refactored query |
| F3 | INFO | medium | MiniMax | Skipped | UNSAFE: ambiguous context |

### Summary
- Applied: X/Y fixes
- MiniMax verified: N fixes ($0.XXXX)
- Opus applied: M fixes
- Skipped: K fixes (see notes)
- Quality gates: typecheck [PASS/FAIL] | tests [PASS/FAIL]

### Next Step
[If all passed]: Changes ready. Run `git add -p` to review, then commit.
[If failures]: See failing fixes above. Manual intervention needed for: [list]
```

## Rules

- NEVER apply an edit without verifying `old_string` exists in the target file
- NEVER skip typecheck after applying fixes
- If MiniMax says UNSAFE, DO NOT apply — escalate to Opus queue
- If `mcp__llm-swarm__llm_batch` is unavailable, degrade gracefully (apply directly or use Opus)
- Report must include cost of MiniMax verification calls
- Finding IDs in the report must match the original review findings
- One Edit tool call per finding — don't batch multiple edits into one call
