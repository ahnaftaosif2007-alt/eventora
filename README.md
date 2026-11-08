# EVENTORA

EVENTORA is a free event information and organizer portal built with HTML, CSS, vanilla JavaScript, Supabase, and GitHub Pages.

## Live website

- Public event portal: https://ahnaftaosif2007-alt.github.io/eventora/
- Organizer dashboard: https://ahnaftaosif2007-alt.github.io/eventora/admin.html
- Password reset: https://ahnaftaosif2007-alt.github.io/eventora/reset-password.html

## Current public event

**The Inter-Wing Collegiate Debate Championship**  
**Dates:** 13–14 December 2026  
**Organisers:** Preparatorian Debating Club of Bangla Version Boys Wing and MPSC Debate Club of Bangla Version Girls Wing.

The public site currently provides event information and a fee preview. In preview mode, only division and segment selection are interactive; participant detail fields and registration submission are disabled. Registration and payment submission remain intentionally closed until launch approval and confirmed payment instructions are in place. Do not announce registration as open until institutional approval, official contact details, participant privacy information, and confirmed payment instructions are in place.

## Project structure

- `index.html`, `style.css`, `script.js` — public event portal.
- `admin.html`, `admin.css`, `admin.js` — authenticated organizer dashboard.
- `admin-pricing.js` — main-admin pricing controls.
- `reset-password.html`, `reset-password.js` — account recovery page.
- `config.js` — public Supabase project URL and publishable key only.
- `supabase/` — database schema and migrations.
- `tests/` — offline regression and contract checks.

## Hosting

The site is hosted free on GitHub Pages from the `main` branch. Changes merged into `main` are published automatically after the Pages workflow completes.

## Security notes

- Never put a Supabase secret key, legacy `service_role` key, database password, or private credential in browser code or GitHub.
- The browser configuration must contain only the project URL and publishable key.
- Registration and payment submission endpoints remain closed while the public intake is disabled.
- Use test-only dummy information during development. Do not commit real participant records or payment references.

## Organizer access

Open the Organizer Dashboard link above and sign in with an authorized account. Dashboard access is protected by Supabase authentication, role checks, and database row-level security. The public website may link to the dashboard; that does not make dashboard records public.
