# Git Workflow

## Branch Naming

```
feature/<milestone>/<short-description>   e.g. feature/m1/auth-jwt
fix/<short-description>                   e.g. fix/validation-concept-uuid
chore/<short-description>                 e.g. chore/update-prisma
```

## Milestones

```
M1 - foundation        (auth, master data, roles, DB)
M2 - question-pipeline (batch, prompt, import, validation)
M3 - diagram-pipeline  (diagram jobs, R2, rendering)
M4 - review-export     (SME workflow, export engine, n8n sync)
M5 - admin-config      (field registry, subject profiles, schema versions)
M6 - deployment        (Nginx, PM2, backups, logging, CI)
```

## Commit Messages

Format: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

Examples:
```
feat(auth): add JWT refresh token endpoint
fix(import): handle wrapped JSON format from LLM
chore(deps): upgrade prisma to 5.8
docs(api): add diagram pipeline endpoints
test(question): add unit tests for validation engine
```

## Pull Requests

- One PR per feature/fix
- PR title matches commit message format
- PR must pass all CI checks before merge
- Require one reviewer approval
- Squash merge to main

## Protected Branches

- `main` — production-ready. No direct pushes.
- `develop` — integration branch. PRs merged here first.
