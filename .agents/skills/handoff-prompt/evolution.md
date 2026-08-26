# Evolution Log

## 2026-03-04
### Lessons
- Give an outline prompt, not detailed verbose steps — less interference is better
- The follow-up AI is autonomous; over-prescribing HOW defeats the purpose of a handoff
- Keep the template minimal — if a section can be inferred, omit it

## 2026-04-17
### Lessons
- **HIGH-RISK — `## Non-document facts` is the easiest infiltration path for procedural HOW.** Do NOT write procedural bullets ("always run X before Y", "first do A, then B", "use method M") into this section, even when disguised as context. The section is for state, decisions, and history — past-tense facts only. If a bullet describes *how to execute the task*, cut it; the follow-up AI owns the HOW. Self-check before writing any `## Non-document facts` bullet: *"Am I describing what happened/was decided, or what to do next?"* Only the former belongs.

## 2026-04-23
### Lessons
- Ask user a series of key questions to gather additional context you need to best write this prompt

## 2026-08-19
### Lessons
- With-document: the disk brief must not clone the clipboard prompt. Prompt = mental model (why, pointers, success, facts, principles). Document = residue only (already patched, leftover risk, exact extras, where FINDINGS go). Do not repeat Why / Success / Principles / Non-document facts in the file.

## 2026-08-24
### Lessons
- When the follow-up AI’s job is to **coordinate** (orchestrate-v3 parent, especially in goal mode), put a **## Role** block first in the clipboard prompt. Goal mode’s default is implement-in-parent; without an explicit “orchestrator, not implementer” identity, the agent skips dispatch and does the work itself. State that a prior session was stopped for this. Keep Role as identity (who this agent is), not a procedure. Residue may name parent vs child writers; it must not clone the Role paragraph.