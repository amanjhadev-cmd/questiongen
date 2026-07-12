# 05 — Subject Profile

A Subject Profile is the per-subject configuration record that locks in the exact prompt version, schema version, field registry snapshot, and generation settings to use for all batches under that subject.

## Why Subject Profiles

- Prevents prompt drift across batches of the same subject
- Ensures schema consistency for the SME review cycle
- Allows changing configuration per subject without affecting others
- Creates an auditable record of what was used to generate each batch

## Profile Structure

```typescript
{
  id: string                    // UUID
  subject_id: string            // FK → subjects
  prompt_version_id: string     // FK → prompt_versions (locked)
  schema_version_id: string     // FK → schema_versions (locked)
  max_concepts: number          // max concepts per batch (default: 10)
  generation_provider: string   // 'claude' | 'gpt-4o'
  field_registry_json: object   // snapshot of field_registry at time of profile save
  created_by: string            // FK → users
  updated_at: string            // ISO timestamp
}
```

## Subjects and Their Profiles (V1)

### Science (Class 9 & 10, CBSE)

```
generation_provider : claude
max_concepts        : 10
prompt              : Science-MCQ-v3 (or latest version for that subject)
schema              : question-schema-v2
field_registry      : snapshot at profile creation
diagram_required    : true for Physics, Chemistry diagrams
```

### Mathematics (Class 9 & 10, CBSE)

```
generation_provider : claude
max_concepts        : 8
prompt              : Maths-MCQ-v2
schema              : question-schema-v2
field_registry      : snapshot at profile creation
diagram_required    : false (geometry diagrams: conditional)
```

### English (Class 9 & 10, CBSE)

```
generation_provider : claude
max_concepts        : 12
prompt              : English-MCQ-v1
schema              : question-schema-v1
field_registry      : snapshot at profile creation
diagram_required    : false
```

### Hindi (Class 9 & 10, CBSE)

```
generation_provider : claude
max_concepts        : 12
prompt              : Hindi-MCQ-v1
schema              : question-schema-v1
field_registry      : snapshot at profile creation
diagram_required    : false
```

## Profile Lifecycle

```
Admin → Create Profile
           ↓
  Select Subject
           ↓
  Select Prompt Version (dropdown of active prompt versions for subject)
           ↓
  Select Schema Version (dropdown of active schema versions)
           ↓
  Set max_concepts, provider
           ↓
  Save → field_registry_json snapshot is taken and stored
           ↓
  Profile is LOCKED for all new batches created after this point
           ↓
  To change → Create NEW profile version (old batches retain old profile)
```

## Rules

1. A subject may only have ONE active profile at a time.
2. Updating a profile creates a new record; existing batches are NOT retroactively affected.
3. `field_registry_json` is a frozen snapshot — changes to the live field_registry do not cascade to existing profiles.
4. Only Super Admin and Admin can create or update Subject Profiles.
5. The profile selected for a batch is recorded in `batches.profile_id` and cannot be changed after batch creation.

## Profile Selection During Batch Creation

```
User selects Subject
        ↓
System fetches active Subject Profile for that subject
        ↓
Profile details displayed (prompt version, schema version, provider)
        ↓
User confirms → Batch created with profile_id locked
```

If no active profile exists for a subject, batch creation is blocked with error:
> "No active Subject Profile found for this subject. Ask an Admin to configure one."
