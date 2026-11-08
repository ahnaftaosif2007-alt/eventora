# EVENTORA Payment Review — Isolated QA

This QA branch is intentionally separate from `main`. It is not published by the
GitHub Pages site and contains no production data or credentials.

## Run the source-level checks

From the repository root, with Node.js installed:

```bash
node tests/payment-review-source-checks.mjs
```

The script checks that the current frontend and SQL migration retain the expected
review safeguards: verifier authorization, valid decisions, required rejection
notes, note length limit, pending-only updates, reviewer attribution, audit
insertion, confirmation, and post-review refresh.

## Important test boundary

These are static source checks, **not** an end-to-end database test. They do not
connect to Supabase, create registrations, insert payment submissions, or change
any production data.

A later integration test must use a separate Supabase staging project with
synthetic records and staging-only credentials. Never point test scripts at the
production project. Keep public registration and payment submission disabled
until an authorized adult/institutional owner approves launch and the complete
staging test plus privacy review is finished.
