# copus:brainstorm — Interactive Discovery Session

Interactive discovery to clarify what you want to build. Explores the codebase, asks targeted questions, surfaces constraints, then outputs the perfect copus:plan prompt.

## Arguments

- `"rough idea"` — A rough description of what you want to build/change.

## Protocol

### Step 1: Understand the Idea

Read the rough idea. Identify:
- What domain/area of the codebase this touches
- Whether this is a new feature, enhancement, fix, or refactor
- Any obvious technical constraints

### Step 2: Explore Relevant Code

Use Glob and Grep to find related modules, patterns, and conventions. Read key files to understand what already exists.

### Step 3: Ask 3-5 Targeted Questions

Ask the user multiple-choice questions to narrow scope:
- Architecture approach (2-3 options)
- Feature boundaries (what's in scope vs out)
- Integration points (which existing modules to use)
- Priority trade-offs (speed vs quality, features vs simplicity)

Use the AskUserQuestion tool for structured multi-choice questions.

### Step 4: Synthesize

Based on answers, synthesize a clear task description and constraints.

### Step 5: Output copus:plan Prompt

```
Ready for planning. Run:

/copus:plan "task description synthesized from brainstorm" "constraints from answers"
```

## MiniMax Exploration (Optional)

If `mcp__llm-swarm__llm_batch` is available AND the idea touches 4+ modules:

Fan out file reads to MiniMax for parallel analysis. Use results to inform your questions.

If unavailable, explore manually (graceful degradation).
