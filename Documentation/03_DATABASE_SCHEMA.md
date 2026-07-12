# 03 — Database Schema

## Tables Overview

```
users
boards
classes
subjects
chapters
concepts
question_types
prompts
prompt_versions
subject_profiles
field_registry
schemas
schema_versions
batches
questions
question_versions
diagram_jobs
diagram_assets
sme_reviews
exports
batch_exports
```

---

## users

```sql
id            UUID        PRIMARY KEY DEFAULT gen_random_uuid()
email         TEXT        UNIQUE NOT NULL
password_hash TEXT        NOT NULL
name          TEXT        NOT NULL
role          TEXT        NOT NULL  -- 'super_admin' | 'admin' | 'sme' | 'intern'
is_active     BOOLEAN     DEFAULT true
created_at    TIMESTAMPTZ DEFAULT now()
updated_at    TIMESTAMPTZ DEFAULT now()

INDEX: users_email_idx ON users(email)
INDEX: users_role_idx ON users(role)
```

---

## boards

```sql
id         UUID  PRIMARY KEY DEFAULT gen_random_uuid()
name       TEXT  UNIQUE NOT NULL   -- 'CBSE' | 'ICSE' | 'State'
created_at TIMESTAMPTZ DEFAULT now()
```

---

## classes

```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
board_id   UUID NOT NULL REFERENCES boards(id)
name       TEXT NOT NULL             -- 'Class 9' | 'Class 10'
created_at TIMESTAMPTZ DEFAULT now()

UNIQUE: (board_id, name)
INDEX: classes_board_idx ON classes(board_id)
```

---

## subjects

```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
class_id   UUID NOT NULL REFERENCES classes(id)
name       TEXT NOT NULL             -- 'Science' | 'Mathematics'
code       TEXT NOT NULL             -- 'SCI10' | 'MATH10'
created_at TIMESTAMPTZ DEFAULT now()

UNIQUE: (class_id, code)
INDEX: subjects_class_idx ON subjects(class_id)
```

---

## chapters

```sql
id           UUID    PRIMARY KEY DEFAULT gen_random_uuid()
subject_id   UUID    NOT NULL REFERENCES subjects(id)
name         TEXT    NOT NULL
chapter_no   INTEGER NOT NULL
created_at   TIMESTAMPTZ DEFAULT now()

UNIQUE: (subject_id, chapter_no)
INDEX: chapters_subject_idx ON chapters(subject_id)
```

---

## concepts

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
chapter_id   UUID NOT NULL REFERENCES chapters(id)
name         TEXT NOT NULL
uuid         TEXT UNIQUE NOT NULL   -- human-readable concept UUID for exports
created_at   TIMESTAMPTZ DEFAULT now()

INDEX: concepts_chapter_idx ON concepts(chapter_id)
INDEX: concepts_uuid_idx ON concepts(uuid)
```

---

## question_types

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
code        TEXT UNIQUE NOT NULL   -- 'MCQ' | 'FIB' | 'TF' | 'MATCH' | 'SHORT' | 'LONG'
label       TEXT NOT NULL
is_active   BOOLEAN DEFAULT true
created_at  TIMESTAMPTZ DEFAULT now()
```

---

## prompts

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
name         TEXT NOT NULL
subject_id   UUID REFERENCES subjects(id)   -- NULL = global prompt
description  TEXT
created_by   UUID NOT NULL REFERENCES users(id)
is_active    BOOLEAN DEFAULT true
created_at   TIMESTAMPTZ DEFAULT now()
updated_at   TIMESTAMPTZ DEFAULT now()
```

---

## prompt_versions

```sql
id           UUID    PRIMARY KEY DEFAULT gen_random_uuid()
prompt_id    UUID    NOT NULL REFERENCES prompts(id)
version_no   INTEGER NOT NULL
content      TEXT    NOT NULL
variables    JSONB   DEFAULT '[]'   -- ["{{subject}}", "{{chapter}}", "{{count}}"]
notes        TEXT
created_by   UUID    NOT NULL REFERENCES users(id)
created_at   TIMESTAMPTZ DEFAULT now()

UNIQUE: (prompt_id, version_no)
INDEX: prompt_versions_prompt_idx ON prompt_versions(prompt_id)
```

---

## schemas

```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
name       TEXT NOT NULL
created_at TIMESTAMPTZ DEFAULT now()
```

---

## schema_versions

```sql
id          UUID    PRIMARY KEY DEFAULT gen_random_uuid()
schema_id   UUID    NOT NULL REFERENCES schemas(id)
version_no  INTEGER NOT NULL
definition  JSONB   NOT NULL    -- full JSON Schema document
created_by  UUID    NOT NULL REFERENCES users(id)
created_at  TIMESTAMPTZ DEFAULT now()

UNIQUE: (schema_id, version_no)
```

---

## subject_profiles

```sql
id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid()
subject_id          UUID    UNIQUE NOT NULL REFERENCES subjects(id)
prompt_version_id   UUID    NOT NULL REFERENCES prompt_versions(id)
schema_version_id   UUID    NOT NULL REFERENCES schema_versions(id)
max_concepts        INTEGER DEFAULT 10
generation_provider TEXT    DEFAULT 'claude'   -- 'claude' | 'gpt-4o'
field_registry_json JSONB   NOT NULL            -- snapshot of field config at profile save
created_by          UUID    NOT NULL REFERENCES users(id)
updated_at          TIMESTAMPTZ DEFAULT now()
```

---

## field_registry

```sql
id               UUID    PRIMARY KEY DEFAULT gen_random_uuid()
field_name       TEXT    UNIQUE NOT NULL
label            TEXT    NOT NULL
mode             TEXT    NOT NULL    -- 'required' | 'optional' | 'conditional'
dependency       TEXT                -- field_name of the field this depends on
dependency_value TEXT                -- value that triggers this field
data_type        TEXT    NOT NULL    -- 'string' | 'number' | 'boolean' | 'array' | 'object'
validation_rule  JSONB               -- {min_length, max_length, pattern, enum, ...}
rendering_rule   JSONB               -- {type: 'katex'|'html'|'plain', component: ...}
export_rule      JSONB               -- {include_in_json: bool, include_in_pdf: bool, ...}
sort_order       INTEGER DEFAULT 0
is_active        BOOLEAN DEFAULT true
created_at       TIMESTAMPTZ DEFAULT now()
updated_at       TIMESTAMPTZ DEFAULT now()
```

---

## batches

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            TEXT NOT NULL
subject_id      UUID NOT NULL REFERENCES subjects(id)
chapter_id      UUID REFERENCES chapters(id)
profile_id      UUID NOT NULL REFERENCES subject_profiles(id)
status          TEXT NOT NULL DEFAULT 'created'
                -- 'created' | 'generating' | 'importing' | 'validating'
                -- | 'diagramming' | 'reviewing' | 'approved' | 'exported'
created_by      UUID NOT NULL REFERENCES users(id)
assigned_to     UUID REFERENCES users(id)
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()

INDEX: batches_subject_idx ON batches(subject_id)
INDEX: batches_status_idx ON batches(status)
INDEX: batches_created_by_idx ON batches(created_by)
```

---

## questions

```sql
id                UUID    PRIMARY KEY DEFAULT gen_random_uuid()
batch_id          UUID    NOT NULL REFERENCES batches(id)
concept_id        UUID    REFERENCES concepts(id)
concept_uuid      TEXT                          -- denormalised for fast export
question_type_id  UUID    NOT NULL REFERENCES question_types(id)
content           JSONB   NOT NULL              -- full question JSON (validated)
status            TEXT    NOT NULL DEFAULT 'imported'
                  -- 'imported' | 'diagram_pending' | 'diagram_done'
                  -- | 'under_review' | 'approved' | 'rejected'
version           INTEGER NOT NULL DEFAULT 1
import_errors     JSONB   DEFAULT '[]'
created_at        TIMESTAMPTZ DEFAULT now()
updated_at        TIMESTAMPTZ DEFAULT now()

INDEX: questions_batch_idx ON questions(batch_id)
INDEX: questions_status_idx ON questions(status)
INDEX: questions_concept_idx ON questions(concept_id)
```

---

## question_versions

```sql
id           UUID    PRIMARY KEY DEFAULT gen_random_uuid()
question_id  UUID    NOT NULL REFERENCES questions(id)
version_no   INTEGER NOT NULL
content      JSONB   NOT NULL
changed_by   UUID    NOT NULL REFERENCES users(id)
change_note  TEXT
created_at   TIMESTAMPTZ DEFAULT now()

UNIQUE: (question_id, version_no)
```

---

## diagram_jobs

```sql
id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
question_id    UUID NOT NULL REFERENCES questions(id)
description    TEXT NOT NULL
status         TEXT NOT NULL DEFAULT 'pending'
               -- 'pending' | 'processing' | 'done' | 'failed'
attempts       INTEGER DEFAULT 0
error_message  TEXT
created_at     TIMESTAMPTZ DEFAULT now()
updated_at     TIMESTAMPTZ DEFAULT now()

INDEX: diagram_jobs_status_idx ON diagram_jobs(status)
INDEX: diagram_jobs_question_idx ON diagram_jobs(question_id)
```

---

## diagram_assets

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
diagram_job_id UUID NOT NULL REFERENCES diagram_jobs(id)
r2_key        TEXT NOT NULL    -- e.g. diagrams/MATH10/batch-uuid/q-uuid/v1.png
public_url    TEXT NOT NULL
version       INTEGER NOT NULL DEFAULT 1
is_active     BOOLEAN DEFAULT true
created_at    TIMESTAMPTZ DEFAULT now()

INDEX: diagram_assets_job_idx ON diagram_assets(diagram_job_id)
```

---

## sme_reviews

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
question_id  UUID NOT NULL REFERENCES questions(id)
reviewed_by  UUID NOT NULL REFERENCES users(id)
decision     TEXT NOT NULL    -- 'approved' | 'rejected' | 'revision_requested'
notes        TEXT
created_at   TIMESTAMPTZ DEFAULT now()

INDEX: sme_reviews_question_idx ON sme_reviews(question_id)
INDEX: sme_reviews_reviewer_idx ON sme_reviews(reviewed_by)
```

---

## exports

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
name         TEXT NOT NULL
batch_id     UUID NOT NULL REFERENCES batches(id)
format       TEXT NOT NULL    -- 'json' | 'pdf' | 'excel'
r2_key       TEXT
public_url   TEXT
status       TEXT NOT NULL DEFAULT 'pending'
             -- 'pending' | 'processing' | 'done' | 'failed'
created_by   UUID NOT NULL REFERENCES users(id)
created_at   TIMESTAMPTZ DEFAULT now()
updated_at   TIMESTAMPTZ DEFAULT now()

INDEX: exports_batch_idx ON exports(batch_id)
```
