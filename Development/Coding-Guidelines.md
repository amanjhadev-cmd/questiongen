# Coding Guidelines

## General

- TypeScript strict mode everywhere. No `any`.
- Zod for all request/response validation at API boundaries.
- Prisma for all DB queries. No raw SQL except for migrations.
- One concern per file. Controllers call services. Services call repositories. No business logic in controllers.
- No `console.log` in production code. Use the Pino logger from `src/config/logger.ts`.
- All async functions must have try/catch or be wrapped in an error-handling middleware.

## Naming

- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- DB columns: `snake_case` (enforced by Prisma schema)
- API routes: `/kebab-case`
- React components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`

## Error Handling

- Never expose raw DB errors to the client.
- All errors thrown in services must be instances of custom `AppError` class with `statusCode` and `code` fields.
- The global error middleware in `error.middleware.ts` catches everything and formats the response.

## API Response Shape

Success:
```json
{ "data": { ... } }          // single object
{ "data": [...], "meta": { "total": 100, "page": 1, "limit": 20 } }  // list
```

Error: see `15_API_SPECIFICATION.md`.

## Database

- Every table has `created_at` and `updated_at`.
- UUIDs as primary keys everywhere (`gen_random_uuid()`).
- Soft deletes via `is_active = false` (never hard delete user data).
- Add indexes on every FK column and every column used in WHERE filters.

## Auth

- Access token in memory (React state / Zustand). Never localStorage.
- Refresh token in httpOnly cookie.
- All API routes except `/auth/login` and `/auth/refresh` require valid access token.

## Testing

- Unit tests for all service functions (Jest + mock repositories).
- Integration tests for all API routes (Supertest + test database).
- Test file: `<filename>.test.ts` next to the file being tested.
- No test should touch the production database.

## Frontend

- No API calls in components. Use hooks (`useBatch`, `useQuestions`, etc.).
- No inline styles. Use Tailwind classes only.
- Every page has a loading state and an error state.
- Forms use React Hook Form + Zod schemas for validation.
