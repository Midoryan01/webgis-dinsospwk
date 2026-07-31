# INSTRUCTION: Full Next.js System Analysis, Prisma Auth Implementation & Feature Auditing Guide

Act as a **Senior Full-Stack Engineer & QA Specialist** with deep expertise in Next.js (App Router), TypeScript, Prisma ORM, MySQL, and application security.

Your objective is to conduct a **complete, evidence-based audit** of my Next.js repository, implement production-grade authentication based on the existing database schema, verify every existing feature/API, fix any missing or broken functionality, and deliver full documentation — **without modifying the existing UI/design**.

---

## 🎯 MANDATORY RULES (STRICT CONSTRAINTS)

1. **DO NOT MODIFY THE UI/DESIGN** — Keep all Tailwind CSS classes, component layouts, colors, spacing, and JSX/TSX structure exactly as they are. Only touch logic, API calls, state management, hooks, and backend code. Adding invisible behavior (`onSubmit`, `onChange`, `useState`, `useEffect`) is allowed; changing markup or classNames is not.
2. **USE THE EXISTING PRISMA SCHEMA AS SOURCE OF TRUTH** — Do not invent new models unless a feature is provably impossible without one. If a new field/model is truly required, propose it separately and explain why before writing a migration.
3. **STRICT TYPE SAFETY** — No `any`, no `@ts-ignore` unless justified in a comment. Use `zod` (or existing validation library) for runtime validation of all external input (forms, API bodies, query params).
4. **NO SILENT ASSUMPTIONS** — If something in the schema or codebase is ambiguous (e.g., unclear which field is the password hash, or which model represents the session), state the assumption explicitly in `AI_GUIDE.md` before implementing.
5. **BACKWARD COMPATIBILITY** — Do not break existing working features while fixing broken ones. Every change must be verified against current behavior first.
6. **SECURITY BY DEFAULT** — Never log plaintext passwords, tokens, or secrets. Never commit `.env` values. Sanitize all user input before it reaches Prisma queries (Prisma parameterizes queries by default, but validate types/shapes regardless).
7. **INCREMENTAL, TRACEABLE CHANGES** — Prefer small, reviewable diffs per feature/route over one giant rewrite. Each fix must be traceable to an entry in the audit table.
8. **DOCUMENTATION IS MANDATORY** — No implementation is "done" until it's reflected accurately in `AI_GUIDE.md`.

---

## 📋 STEP-BY-STEP EXECUTION PLAN

### STEP 0: Environment & Tooling Baseline
- Detect package manager (`npm` / `pnpm` / `yarn` / `bun`) from lockfile.
- Identify Next.js version, React version, and whether the project uses `app/` only, `pages/` only, or a hybrid.
- Check `.env.example` / `.env` for required variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, `JWT_SECRET`, etc.) and flag any missing from `.env.example` but referenced in code.
- Run `npx prisma validate` and `npx prisma format` (read-only checks) to confirm the schema is syntactically valid before relying on it.
- Confirm the project builds/lints cleanly (`next build`, `eslint`, `tsc --noEmit`) *before* any changes, to establish a baseline of pre-existing errors vs. errors you introduce.

### STEP 1: Repository & Codebase Analysis
- Scan and map the full project structure: `/app`, `/components`, `/lib`, `/server` (or `actions/`), `/prisma`, `/middleware.ts`, `/types`.
- Produce a **route inventory**: every page route, every API route (`route.ts`), every Server Action, with HTTP method(s), expected input, and expected output.
- Read `prisma/schema.prisma` in full: models, fields, types, relations (1:1, 1:N, N:N), enums, indexes, and unique constraints — especially on the User/Auth-related models.
- Identify which model represents the authenticated entity (`User`, `Admin`, `Account`, etc.) and which fields represent credentials (email/username, password hash), roles/permissions, and status (active/banned/verified).
- Note any existing auth-adjacent tables (`Session`, `Token`, `VerificationToken`, `RefreshToken`, `PasswordReset`) so the implementation reuses them instead of duplicating logic.

### STEP 2: Authentication Implementation (Login System)
- Detect current auth approach, if any (NextAuth.js/Auth.js, Lucia, custom JWT via `jose`, iron-session, plain cookies, or none).
- **If partially implemented**: repair and complete it using the existing pattern rather than replacing the library.
- **If missing**: implement a custom session-based or JWT-based auth flow consistent with the schema, including:
  - Secure password hashing/verification with `bcrypt` or `argon2` (never plaintext or reversible encryption).
  - Login Server Action / API route (`/api/auth/login` or equivalent) with input validation (`zod`), rate-limiting consideration, and generic error messages that don't leak whether the email or password was wrong.
  - Session issuance via **httpOnly, secure, sameSite** cookies (or JWT stored the same way) — never `localStorage` for tokens.
  - Logout endpoint that properly invalidates the session/cookie.
  - Session refresh strategy if using short-lived JWTs (refresh token rotation, or a sliding session).
- **Route protection**: implement/repair `middleware.ts` to guard protected routes (e.g. `/dashboard/*`), redirecting unauthenticated users to `/login`, and redirecting already-authenticated users away from `/login`.
- **Role-Based Access Control (RBAC)**, if the schema has a `role`/`permission` field: enforce it both in middleware (coarse-grained) and inside Server Actions/API routes (fine-grained, since middleware alone is not sufficient for sensitive mutations).
- **CSRF/session hygiene**: confirm mutating Server Actions/API routes only trust the session cookie, not client-supplied user IDs in the request body.
- Provide a minimal test checklist for the login flow (valid login, invalid password, non-existent user, expired session, protected route redirect).

### STEP 3: API & Feature Audit
For every page and API route/Server Action found in Step 1, audit:

1. **API Endpoints** — Fully functional? Correctly wired to Prisma? Correct HTTP status codes returned (200/201/400/401/403/404/409/500)? Errors caught and returned as structured JSON rather than crashing the route?
2. **Data Flow** — Data fetched via Prisma is correctly typed, correctly mapped to the frontend component's expected shape, and correctly rendered (check for silent `undefined`/`null` rendering, mismatched field names, or unhandled loading/empty states).
3. **CRUD Completeness** — For every entity, confirm Create, Read, Update, Delete all exist where the UI implies they should (e.g., an edit button that has no working handler, a delete icon with no confirm/no action).
4. **Edge Cases** — Empty states, pagination boundaries, race conditions on double-submit, duplicate unique-field submissions (e.g., duplicate email), file upload size/type limits, Excel import with malformed rows, timezone/date handling.
5. **Input Validation** — Every form and API input validated server-side (not just client-side), with clear, actionable error messages returned to the existing UI's error-display mechanism (without changing that mechanism's markup).
6. **Authorization Checks** — Every protected mutation re-verifies the session/role server-side, even if the UI already hides the button from unauthorized users.
7. **N+1 / Performance Issues** — Flag obvious Prisma N+1 query patterns (loops calling `findUnique` instead of a single `findMany` with `include`/`where: { in: [...] }`).

### STEP 4: Refactoring & Fixing (Without UI Changes)
- Fix broken API connections, missing Server Actions, or malformed Prisma queries (wrong relation names, missing `include`/`select`, incorrect `where` clauses).
- Implement missing backend logic for half-finished features, strictly following existing project conventions (folder structure, naming, response shape, error-handling pattern already used elsewhere in the repo).
- Ensure Excel import/export, scoring logic, and data aggregations are fully operational and numerically correct (add unit tests or at least manual verification notes for calculation-heavy logic).
- Add defensive error handling (`try/catch`, Prisma error codes like `P2002` unique constraint violations) with user-facing messages appropriate to the existing UI's error components.
- Do not alter JSX/TSX layout tags, component hierarchy, or Tailwind classes — only add logic-level attributes/handlers.
- Add code comments where a fix is non-obvious, so the reasoning survives future refactors.

### STEP 5: Testing & Verification
- Re-run `next build`, `tsc --noEmit`, and lint after all changes; confirm zero new errors versus the Step 0 baseline.
- Manually (or via a lightweight script) verify each item in the audit table actually works end-to-end, not just compiles.
- Verify protected routes reject unauthenticated requests (test with cookies cleared) and accept authenticated ones.
- Verify role-restricted routes reject users with insufficient roles.
- Confirm no secrets, tokens, or password hashes are exposed in API responses or client-side props.

### STEP 6: Create `AI_GUIDE.md` Documentation
Generate a comprehensive Markdown file in the project root containing:

1. **System Overview** — Architecture summary, tech stack, folder structure diagram.
2. **Environment Setup** — Required `.env` variables and what each one is for.
3. **Database Structure** — Prisma models, fields, relationships (with an ER-style summary), and which models are auth-related.
4. **Auth Flow Explanation** — Sequence of login → session issuance → middleware check → protected route access → logout, plus how RBAC is enforced.
5. **Feature & API Audit Table**:

   | Feature / Route | Status (OK / Fixed / Implemented / Known Issue) | Associated API / Action | Notes / Changes Made |
   | :--- | :--- | :--- | :--- |
   | `/dashboard` | Fixed | `getDashboardData()` (Server Action) | Fixed N+1 query, added null-guard for empty datasets |
   | `/api/auth/login` | Implemented | `route.ts` | Added bcrypt verification + httpOnly session cookie |

6. **Known Limitations / Follow-ups** — Anything intentionally left unfixed (and why), plus recommended next steps.
7. **How to Run & Test** — Step-by-step: install deps, set up `.env`, run migrations (`prisma migrate dev`), run seeds, start dev server, test login with sample credentials, run build/lint.
8. **Security Notes** — Summary of hashing algorithm used, cookie flags, session lifetime, and any rate-limiting/CSRF considerations for future hardening.

---

## 🚀 START EXECUTION

Begin with **Step 0 and Step 1 only**: establish the environment baseline, scan the codebase, and analyze `schema.prisma`. Present the initial audit findings — route inventory, detected auth model, and any ambiguities — **before** writing or modifying any code, so assumptions can be confirmed first.