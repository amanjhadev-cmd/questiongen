# 07 — JSON Schema

## Overview

Every question imported into the platform must validate against the active JSON Schema version pinned to the batch's Subject Profile. Validation is the gate — questions that fail cannot proceed.

## Production Question JSON (MCQ Example)

```json
{
  "question_text": "Which of the following is an example of a redox reaction?",
  "question_type": "MCQ",
  "marks": 1,
  "difficulty": "medium",
  "bloom_level": "understand",
  "concept_uuid": "SCI-1042-CH3A",
  "options": [
    { "key": "A", "text": "NaCl dissolving in water" },
    { "key": "B", "text": "Rusting of iron in the presence of oxygen and moisture" },
    { "key": "C", "text": "Melting of ice" },
    { "key": "D", "text": "Evaporation of water" }
  ],
  "correct_option": "B",
  "explanation": "Rusting involves iron (Fe) being oxidised to Fe₂O₃, which is a redox reaction. The others are physical changes or simple dissolution.",
  "diagram_required": false,
  "tags": ["redox", "rusting", "oxidation"],
  "hint": "Look for the reaction where electron transfer occurs.",
  "bloom_level": "understand",
  "language": "en",
  "is_ncert": true,
  "ncert_page": 12
}
```

## JSON Schema v2 Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "QuestionSchema",
  "type": "object",
  "required": ["question_text", "question_type", "marks", "difficulty", "bloom_level", "concept_uuid", "explanation"],
  "properties": {
    "question_text": {
      "type": "string",
      "minLength": 10,
      "maxLength": 2000
    },
    "question_type": {
      "type": "string",
      "enum": ["MCQ", "FIB", "TF", "MATCH", "SHORT", "LONG"]
    },
    "marks": {
      "type": "number",
      "minimum": 1,
      "maximum": 10
    },
    "difficulty": {
      "type": "string",
      "enum": ["easy", "medium", "hard"]
    },
    "bloom_level": {
      "type": "string",
      "enum": ["remember", "understand", "apply", "analyze", "evaluate", "create"]
    },
    "concept_uuid": {
      "type": "string",
      "pattern": "^[A-Z]{2,6}-\\d{4}-[A-Z0-9]{4}$"
    },
    "explanation": {
      "type": "string",
      "minLength": 20,
      "maxLength": 3000
    },
    "options": {
      "type": "array",
      "minItems": 4,
      "maxItems": 4,
      "items": {
        "type": "object",
        "required": ["key", "text"],
        "properties": {
          "key": { "type": "string", "enum": ["A", "B", "C", "D"] },
          "text": { "type": "string", "minLength": 1 }
        }
      }
    },
    "correct_option": {
      "type": "string",
      "enum": ["A", "B", "C", "D"]
    },
    "diagram_required": {
      "type": "boolean"
    },
    "diagram_description": {
      "type": "string",
      "minLength": 10
    },
    "tags": {
      "type": "array",
      "maxItems": 10,
      "items": { "type": "string" }
    },
    "hint": {
      "type": "string",
      "maxLength": 500
    },
    "language": {
      "type": "string",
      "enum": ["en", "hi"],
      "default": "en"
    },
    "is_ncert": {
      "type": "boolean"
    },
    "ncert_page": {
      "type": "number"
    },
    "year_asked": {
      "type": "number",
      "minimum": 2000,
      "maximum": 2030
    }
  },
  "if": {
    "properties": { "question_type": { "const": "MCQ" } }
  },
  "then": {
    "required": ["options", "correct_option"]
  },
  "allOf": [
    {
      "if": {
        "properties": { "diagram_required": { "const": true } }
      },
      "then": {
        "required": ["diagram_description"]
      }
    },
    {
      "if": {
        "properties": { "is_ncert": { "const": true } }
      },
      "then": {
        "required": ["ncert_page"]
      }
    }
  ]
}
```

## Import JSON Format

The LLM returns an array of questions:

```json
{
  "questions": [
    { ...question1 },
    { ...question2 }
  ],
  "metadata": {
    "subject": "Science",
    "chapter": "Chemical Reactions",
    "generated_at": "2024-01-15T10:30:00Z",
    "model": "claude-sonnet-5",
    "prompt_version": "v3"
  }
}
```

The `metadata` block is stored separately; each item in `questions` is validated individually.

## Fields Added by the System (NOT in import JSON)

These fields are added by the platform after import — the LLM must NOT generate them:

| Field | Added When |
|---|---|
| `diagram_url` | After Diagram Pipeline completes |
| `diagram_alt_text` | After Diagram Pipeline completes |
| `created_at` | At import time |
| `updated_at` | On any update |
| `batch_id` | At import time |
| `version` | At import time (starts at 1) |
| `status` | At import time (starts as 'imported') |
