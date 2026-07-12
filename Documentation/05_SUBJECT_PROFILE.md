# 05 — Subject Profile

A Subject Profile is the per-subject configuration record that locks in the prompt version, schema version, field registry snapshot, feature flags, and generation settings. Every batch inherits from its subject's active profile.

## Why Subject Profiles

- Prevents prompt drift across batches of the same subject
- Ensures schema consistency for the SME review cycle
- Controls which features (concepts, diagrams, passages, solution steps) are active per subject
- Creates an auditable record of what configuration produced each batch
- All behaviour is configured here — nothing is hardcoded in the application

## Profile Structure

```typescript
{
  id: string
  subject_id: string                 // FK → subjects (unique — one active profile per subject)
  prompt_version_id: string          // FK → prompt_versions (locked)
  schema_version_id: string          // FK → schema_versions (locked)
  max_concepts: number               // 0 = concept mapping disabled; 2-3 typical for science
  generation_provider: string        // 'manual_qwen' | 'manual_gpt' | 'manual_other'
  field_registry_json: object        // frozen snapshot of field_registry at profile save time
  // Feature flags
  diagram_enabled: boolean           // enables diagram_required / diagram_description fields
  passage_enabled: boolean           // enables passage field (comprehension questions)
  concept_enabled: boolean           // true only when max_concepts > 0
  solution_steps_enabled: boolean    // enables solution_steps array (maths/physics)
  created_by: string
  updated_at: string
}
```

---

## Subject Profiles (V1 — CBSE)

### Science (Class 9 & 10)

```
generation_provider    : manual_qwen
max_concepts           : 3         ← max 3 concepts per question
concept_enabled        : true
diagram_enabled        : true      ← physics & chemistry diagrams
passage_enabled        : false
solution_steps_enabled : false
prompt_version         : Science-MCQ-v6 (latest published)
schema_version         : question-schema-v2
field_registry_json    : snapshot at profile save time
```

### Mathematics (Class 9 & 10)

```
generation_provider    : manual_qwen
max_concepts           : 2
concept_enabled        : true
diagram_enabled        : true      ← geometry diagrams
passage_enabled        : false
solution_steps_enabled : true      ← step-by-step solutions
prompt_version         : Maths-MCQ-v2
schema_version         : question-schema-v2
```

### English (Class 9 & 10)

```
generation_provider    : manual_qwen
max_concepts           : 0         ← concept mapping disabled
concept_enabled        : false
diagram_enabled        : false     ← no diagrams
passage_enabled        : true      ← comprehension passages
solution_steps_enabled : false
prompt_version         : English-MCQ-v1
schema_version         : question-schema-v1
```

### Hindi (Class 9 & 10)

```
generation_provider    : manual_qwen
max_concepts           : 0
concept_enabled        : false
diagram_enabled        : false
passage_enabled        : true
solution_steps_enabled : false
prompt_version         : Hindi-MCQ-v1
schema_version         : question-schema-v1
```

---

## How the Profile Drives Batch Behaviour

When a batch is created:

```
Intern selects Subject
        ↓
System fetches active Subject Profile
        ↓
Profile controls:
  - Which prompt version is used (and displayed to intern)
  - Which schema version validates the import
  - Whether concept list is shown (concept_enabled)
  - How many concepts max per question (max_concepts)
  - Whether diagram fields are active (diagram_enabled)
  - Whether passage is required (passage_enabled)
  - Whether solution steps are required (solution_steps_enabled)
  - Which field_registry_json snapshot governs validation
        ↓
All of this is locked at batch creation time
```

---

## Profile Lifecycle

```
Super Admin → Create Profile for Subject
        ↓
  Select Prompt Version (published versions only)
        ↓
  Select Schema Version
        ↓
  Set max_concepts, generation_provider
        ↓
  Toggle feature flags (diagram, passage, concept, solution_steps)
        ↓
  Save → field_registry_json snapshot taken and frozen
        ↓
  Profile is active for all NEW batches
        ↓
  Existing batches retain the profile that was active at their creation time
```

## Rules

1. A subject may only have ONE active profile at a time.
2. Updating a profile creates a new record — old batches are NOT retroactively affected.
3. `field_registry_json` is a frozen snapshot — changes to the live field_registry do not cascade.
4. Only Super Admin can create or update Subject Profiles.
5. If no active profile exists for a subject, batch creation is blocked:
   > "No active Subject Profile found for this subject. Ask a Super Admin to configure one."
6. `concept_enabled` must be false when `max_concepts = 0`.
7. The `generation_provider` field documents which external tool interns should use — it does not trigger any API call.
