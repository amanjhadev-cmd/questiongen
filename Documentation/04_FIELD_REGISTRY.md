# 04 — Field Registry

The Field Registry is the single source of truth for every field that can appear in a question's JSON. It drives import validation, rendering, and export behaviour. Nothing is hardcoded — every field's behaviour is configured here.

## Field Record Structure

```typescript
{
  field_name: string          // e.g. "question_text"
  label: string               // Human-readable label for UI
  mode: "required" | "optional" | "disabled" | "auto"
  data_type: "string" | "number" | "boolean" | "array" | "object"
  validation_rule: {
    min_length?: number
    max_length?: number
    pattern?: string          // regex
    enum?: string[]
    min_items?: number        // for arrays
    max_items?: number
    item_schema?: object      // JSON Schema for array items
  }
  rendering_rule: {
    type: "katex" | "html" | "plain" | "image" | "table"
    component: string         // React component name
    wrap_in?: string
  }
  export_rule: {
    include_in_json: boolean
    include_in_pdf: boolean
    include_in_excel: boolean
    pdf_label?: string
    excel_column?: string
  }
  sort_order: number
}
```

## Field Modes

| Mode | Meaning | Import Behaviour |
|---|---|---|
| `required` | Must always be present | Blocked if missing or empty |
| `optional` | May be present | Validated only when present |
| `disabled` | Turned off for this subject via Subject Profile | Rejected if present in import (soft warning) |
| `auto` | Injected by the system during Metadata Injection (Phase 7) | Must NOT appear in imported JSON; error if present |

Subject Profile feature flags (`diagram_enabled`, `passage_enabled`, `concept_enabled`, `solution_steps_enabled`) control which `optional` fields are promoted to `required` or `disabled` for that subject.

---

## Core Fields (All Question Types)

| field_name | mode | data_type | validation | rendering | export |
|---|---|---|---|---|---|
| `question_text` | required | string | min:10, max:2000 | katex | json, pdf, excel |
| `question_type` | required | string | enum:[MCQ,FIB,TF,MATCH,SHORT,LONG] | plain | json, pdf, excel |
| `marks` | required | number | min:1, max:10 | plain | json, pdf, excel |
| `difficulty` | required | string | enum:[easy,medium,hard] | plain | json, pdf, excel |
| `bloom_level` | required | string | enum:[remember,understand,apply,analyze,evaluate,create] | plain | json, excel |
| `explanation` | required | string | min:20, max:3000 | katex | json, pdf |
| `tags` | optional | array | max_items:10, item: string | plain | json, excel |
| `hint` | optional | string | max:500 | katex | json, pdf |
| `source` | optional | string | max:200 | plain | json, excel |

---

## Auto-Injected Fields (Phase 7 — Metadata Injection)

These fields are set by the system during Phase 7. They must NOT be in the imported JSON.

| field_name | mode | data_type | Source |
|---|---|---|---|
| `board` | auto | string | Batch → Subject → Class → Board |
| `class` | auto | string | Batch → Subject → Class |
| `subject` | auto | string | Batch → Subject |
| `chapter_uuid` | auto | string | Batch → Chapter UUID |
| `batch_uuid` | auto | string | Batch ID |
| `prompt_version` | auto | string | Subject Profile → Prompt Version |
| `schema_version` | auto | string | Subject Profile → Schema Version |
| `created_by` | auto | string | Current user ID |
| `created_at` | auto | string | ISO timestamp |

---

## Concept Fields (Subject Profile: concept_enabled = true)

| field_name | mode | data_type | validation |
|---|---|---|---|
| `concept_uuids` | required (when concept_enabled) | array | min_items:1, max_items: ≤ subject_profile.max_concepts |
| `concept_uuids[]` | — | string | pattern: ^[A-Z]{2,6}-\d{4}-[A-Z0-9]{4}$ |

When `concept_enabled = false` (e.g. English), this field is `disabled` — validation rejects it if present.

---

## MCQ-Specific Fields

| field_name | mode | data_type | validation |
|---|---|---|---|
| `options` | required | array | min_items:4, max_items:4 |
| `options[].key` | required | string | enum:[A,B,C,D] |
| `options[].text` | required | string | min:1 |
| `correct_option` | required | string | enum:[A,B,C,D] |
| `distractor_rationale` | optional | object | keys: A,B,C,D |

Validation also checks: no duplicate option texts, correct_option key must exist in options array.

---

## FIB (Fill-in-the-Blank) Specific Fields

| field_name | mode | data_type | validation |
|---|---|---|---|
| `blanks` | required | array | min_items:1, max_items:5 |
| `blanks[].position` | required | number | integer index |
| `blanks[].answer` | required | string | min:1, max:100 |
| `blanks[].alternatives` | optional | array | accepted alternate answers |

---

## True/False Specific Fields

| field_name | mode | data_type | validation |
|---|---|---|---|
| `correct_answer` | required | boolean | true or false |

---

## Match-the-Following Specific Fields

| field_name | mode | data_type | validation |
|---|---|---|---|
| `column_a` | required | array | min_items:3, max_items:6 |
| `column_b` | required | array | min_items:3, max_items:6 |
| `correct_matches` | required | object | keys from column_a mapped to column_b values |

---

## Diagram Fields (Subject Profile: diagram_enabled = true)

| field_name | mode | data_type | notes |
|---|---|---|---|
| `diagram_required` | optional | boolean | Intern can set true/false per question |
| `diagram_description` | required (when diagram_required=true) | string | min:10 — intern writes this; Qwen generates it |
| `diagram_url` | auto | string | Added by system after R2 upload — NEVER in imported JSON |
| `diagram_alt_text` | auto | string | Generated from description — NEVER in imported JSON |

When `diagram_enabled = false` (e.g. English), the entire diagram group is `disabled`.

---

## Passage Field (Subject Profile: passage_enabled = true)

| field_name | mode | data_type | notes |
|---|---|---|---|
| `passage` | required (when passage_enabled) | string | min:50, max:5000 — for comprehension questions |

---

## Solution Steps Field (Subject Profile: solution_steps_enabled = true)

| field_name | mode | data_type | notes |
|---|---|---|---|
| `solution_steps` | required (when solution_steps_enabled) | array | Step-by-step maths/physics solution |
| `solution_steps[].step_no` | required | number | |
| `solution_steps[].content` | required | string | KaTeX-rendered |

---

## Validation Precedence

1. `auto` fields → rejected if present in import (they are system-owned)
2. `disabled` fields → warning if present in import
3. `required` fields → must be present and non-empty
4. `optional` fields → validated only when present
5. Type checks run first, then validation_rule checks
6. Question-type-specific rules run after core field checks
7. Concept UUID checks run last (requires DB lookup)
