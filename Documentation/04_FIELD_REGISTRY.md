# 04 — Field Registry

The Field Registry is the single source of truth for every field that can appear in a question's JSON. It drives import validation, rendering, and export behaviour.

## Field Record Structure

```typescript
{
  field_name: string          // e.g. "question_text"
  label: string               // Human-readable label for UI
  mode: "required" | "optional" | "conditional"
  dependency?: string         // field_name of trigger field (only for conditional)
  dependency_value?: string   // value of trigger field that activates this field
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
    component: string         // React component name, e.g. "KatexRenderer"
    wrap_in?: string          // optional HTML wrapper
  }
  export_rule: {
    include_in_json: boolean
    include_in_pdf: boolean
    include_in_excel: boolean
    pdf_label?: string        // override label in PDF
    excel_column?: string     // column header in Excel
  }
  sort_order: number
}
```

---

## Core Fields (All Question Types)

| field_name | mode | data_type | validation | rendering | export |
|---|---|---|---|---|---|
| `question_text` | required | string | min:10, max:2000 | katex | json, pdf, excel |
| `question_type` | required | string | enum:[MCQ,FIB,TF,MATCH,SHORT,LONG] | plain | json, pdf, excel |
| `marks` | required | number | min:1, max:10 | plain | json, pdf, excel |
| `difficulty` | required | string | enum:[easy,medium,hard] | plain | json, pdf, excel |
| `concept_uuid` | required | string | pattern: ^[A-Z]{2,6}-\d{4}-[A-Z0-9]{4}$ | plain | json only |
| `bloom_level` | required | string | enum:[remember,understand,apply,analyze,evaluate,create] | plain | json, excel |
| `explanation` | required | string | min:20, max:3000 | katex | json, pdf |
| `tags` | optional | array | max_items:10, item: string | plain | json, excel |
| `hint` | optional | string | max:500 | katex | json, pdf |
| `source` | optional | string | max:200 | plain | json, excel |

---

## MCQ-Specific Fields

| field_name | mode | data_type | validation | notes |
|---|---|---|---|---|
| `options` | required | array | min_items:4, max_items:4 | Each option: {key: string, text: string} |
| `correct_option` | required | string | enum:[A,B,C,D] | Key of the correct option |
| `distractor_rationale` | optional | object | keys: A,B,C,D | Why each wrong option is wrong |

---

## FIB (Fill-in-the-Blank) Specific Fields

| field_name | mode | data_type | validation |
|---|---|---|---|
| `blanks` | required | array | min_items:1, max_items:5 |
| `blanks[].position` | required | number | Integer index in question_text |
| `blanks[].answer` | required | string | min:1, max:100 |
| `blanks[].alternatives` | optional | array | Accepted alternate answers |

---

## True/False Specific Fields

| field_name | mode | data_type | validation |
|---|---|---|---|
| `correct_answer` | required | boolean | true or false |
| `statement` | required | string | min:10, max:500 |

---

## Match-the-Following Specific Fields

| field_name | mode | data_type | validation |
|---|---|---|---|
| `column_a` | required | array | min_items:3, max_items:6 |
| `column_b` | required | array | min_items:3, max_items:6 |
| `correct_matches` | required | object | Keys from column_a mapped to column_b values |

---

## Diagram Fields (Conditional)

| field_name | mode | dependency | dependency_value | data_type |
|---|---|---|---|---|
| `diagram_required` | optional | — | — | boolean |
| `diagram_description` | conditional | `diagram_required` | `true` | string |
| `diagram_url` | conditional | `diagram_required` | `true` | string |
| `diagram_alt_text` | conditional | `diagram_required` | `true` | string |

`diagram_url` is populated by the Diagram Pipeline after generation — it must NOT be present in the raw imported JSON.

---

## Metadata Fields

| field_name | mode | data_type | notes |
|---|---|---|---|
| `language` | optional | string | enum:[en,hi] default: en |
| `is_ncert` | optional | boolean | true if sourced from NCERT textbook |
| `ncert_page` | conditional | `is_ncert` is true | number | Page reference |
| `year_asked` | optional | number | Board exam year this appeared |

---

## Validation Precedence

1. `required` fields → must be present and non-empty
2. `conditional` fields → validated only when their dependency condition is met
3. `optional` fields → validated only when present
4. Type checks run first, then validation_rule checks
5. Unknown fields in imported JSON are flagged as warnings, not errors (soft fail)
