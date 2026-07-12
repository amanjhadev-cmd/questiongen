# 06 — Prompt Library

## Overview

The Prompt Library stores every approved LLM prompt used to generate questions. Each prompt has immutable versioned snapshots. Prompts are selected per Subject Profile. Interns view and copy prompts — they do not edit them.

## Storage

```
prompts
  └── prompt_versions (1 prompt → many versions)
```

## What the Intern Sees (Phase 2)

After creating a batch, the intern goes to the Prompt Library page for that batch. They see:

```
┌─────────────────────────────────────────────────────────┐
│ PROMPT — Science MCQ v6                                  │
│ (Published · Used by: CBSE Class 10 Science)            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ You are an expert Science teacher for CBSE Class 10.    │
│                                                          │
│ Generate 20 multiple choice questions on the chapter    │
│ "Chemical Reactions and Equations".                     │
│                                                          │
│ Focus on these concepts (provided below).               │
│                                                          │
│ Rules:                                                   │
│ - Each question must have exactly 4 options (A, B, C, D)│
│ - Mark one correct answer                               │
│ - Include a detailed explanation                        │
│ - Difficulty: Easy                                      │
│ - Bloom's level: Remember                               │
│ - Maximum 3 concepts per question                       │
│ - Return ONLY valid JSON. No markdown, no preamble.     │
│                                                          │
│ [Copy Prompt]                                            │
├─────────────────────────────────────────────────────────┤
│ CONCEPT LIST (concept_enabled = true)                    │
│                                                          │
│ UUID: SCI-1042-CH3A                                      │
│ Concept: Combination Reaction                            │
│ Note: Two or more substances combine to form a single   │
│       new substance. E.g. 2H₂ + O₂ → 2H₂O             │
│ ─────────────────────────────────────────────────────── │
│ UUID: SCI-1042-CH3B                                      │
│ Concept: Decomposition Reaction                          │
│ Note: A single compound breaks into two or more simpler │
│       substances when heated, light, or electricity.    │
│ ─────────────────────────────────────────────────────── │
│ UUID: SCI-1042-CH3C                                      │
│ Concept: Redox Reaction                                  │
│ Note: Simultaneous oxidation and reduction. One species │
│       loses electrons (oxidised), other gains (reduced).│
│                                                          │
│ [Copy Concept List]                                      │
└─────────────────────────────────────────────────────────┘
```

If `concept_enabled = false` (English, Hindi), the Concept List section is hidden entirely.

The intern copies the prompt (and concept list if shown), then pastes both into Qwen Chat externally.

## Prompt Format

Every prompt is a plain text template. Variables like `{{chapter}}` are pre-filled by the system before display — the intern copies the already-interpolated text.

```
You are an expert {{subject}} teacher for {{board}} {{class}}.

Generate {{count}} {{question_type}} questions on the chapter "{{chapter}}".

Rules:
- Each question must have exactly 4 options (A, B, C, D)
- Mark one correct answer
- Include a detailed explanation
- Difficulty: {{difficulty}}
- Bloom's level: {{bloom_level}}
- Maximum {{max_concepts}} concepts per question
- Return ONLY valid JSON. No markdown, no preamble.

JSON Schema to follow:
{{schema}}
```

## Variables Interpolated at Display Time

| Variable | Source |
|---|---|
| `{{subject}}` | Subject name |
| `{{board}}` | Board name |
| `{{class}}` | Class name |
| `{{chapter}}` | Batch chapter name |
| `{{count}}` | Batch question_count |
| `{{question_type}}` | Batch question_type |
| `{{difficulty}}` | Batch difficulty |
| `{{bloom_level}}` | Not in batch — intern selects from dropdown on prompt page |
| `{{max_concepts}}` | Subject Profile max_concepts |
| `{{schema}}` | Schema Version definition (formatted JSON) |

## Versioning

- Versions are numbered sequentially: v1, v2, v3 ...
- Published versions are immutable — no edits allowed
- A version can be archived but never deleted
- Subject Profiles pin a specific version_id, not "latest"

## Version States

```
draft → published → archived
```

- `draft`: Work in progress — not available for Subject Profile selection or intern viewing
- `published`: Available and visible to interns
- `archived`: Hidden from everything; kept for audit

## Copy Behaviour

"Duplicate as new version" button (Admin only):
- Copies current version content into a new `draft` version
- Version number increments
- Original is unchanged
- New version author = current user

## Access Rules

| Role | Access |
|---|---|
| Super Admin | Full CRUD + publish + archive |
| Admin | Create prompts, edit draft versions, duplicate versions |
| SME | Read-only: can view prompt used for a batch; cannot see Prompt Library nav |
| Intern | Read-only: sees only the prompt for their current batch; cannot browse Prompt Library |
