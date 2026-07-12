# 06 — Prompt Library

## Overview

The Prompt Library stores every LLM prompt used to generate questions. Each prompt has immutable versioned snapshots. Prompts are selected per Subject Profile.

## Storage

Prompts are stored in the `prompts` table. Each version is a row in `prompt_versions`.

```
prompts
  └── prompt_versions (1 prompt → many versions)
```

## Prompt Format

Every prompt is a Handlebars-style template with double-brace variables:

```
You are an expert {{subject}} teacher for {{board}} {{class}}.

Generate {{count}} multiple choice questions on the chapter "{{chapter}}".

Focus on these concepts: {{concepts}}

Rules:
- Each question must have exactly 4 options (A, B, C, D)
- Mark one correct answer
- Include a detailed explanation
- Set difficulty as: {{difficulty}}
- Use Bloom's taxonomy level: {{bloom_level}}
- Return ONLY valid JSON matching the provided schema. No markdown, no preamble.

JSON Schema:
{{schema}}
```

## Variables

| Variable | Source | Example |
|---|---|---|
| `{{subject}}` | Subject Profile → Subject name | "Science" |
| `{{board}}` | Batch → Subject → Class → Board | "CBSE" |
| `{{class}}` | Batch → Subject → Class | "Class 10" |
| `{{chapter}}` | Batch chapter | "Chemical Reactions" |
| `{{concepts}}` | Comma-separated from batch | "Oxidation, Reduction, Redox" |
| `{{count}}` | User input at generation time | "20" |
| `{{difficulty}}` | User input at generation time | "medium" |
| `{{bloom_level}}` | User input at generation time | "apply" |
| `{{schema}}` | Schema Version definition JSON | {...} |

## Versioning

- A new version is created by copying the previous version content and editing it.
- Versions are numbered sequentially: v1, v2, v3 ...
- Published versions are immutable — no edits allowed.
- A version can be archived (hidden from dropdowns) but never deleted.
- Subject Profiles pin a specific version_id, not "latest".

## Version States

```
draft → published → archived
```

- `draft`: Work in progress, not available for Subject Profile selection
- `published`: Available for Subject Profile selection
- `archived`: Hidden from selection, but still readable for audit

## Fetching Logic

When n8n triggers question generation:

1. Read `batch.profile_id` → `subject_profiles.prompt_version_id`
2. Fetch `prompt_versions` row by ID
3. Interpolate variables into template
4. Send completed prompt to LLM API

## Copy Behaviour

"Duplicate" button on prompt page:
- Copies current version content into a new `draft` version
- Version number increments
- Original version is unchanged
- Author of new version is the current user

## Prompt Library UI Rules

- Super Admin and Admin: full read/write
- SME: read-only (can view prompt content, cannot edit)
- Intern: read-only

## Selection Logic (Subject Profile Editor)

Dropdown shows only:
- Versions in `published` state
- Filtered to prompts where `subject_id` matches OR `subject_id` is NULL (global prompts)
- Sorted by: subject-specific first, then global; newest version first
