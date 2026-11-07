# EVENTORA — Admin dashboard setup

This branch package adds a restricted organizer console at `admin.html`. It uses Supabase Auth for sign-in and PostgreSQL Row Level Security (RLS) to protect records.

## 1. Create your Supabase project
1. Open https://supabase.com/dashboard and create a new project.
2. Wait until the project is ready.
3. In Project Settings → API Keys, copy the Project URL and the Publishable key (`sb_publishable_...`).

Only the Project URL and publishable key belong in the browser. Never place a Secret key, legacy `service_role` key, database password or private credential in this repository.

## 2. Create the database
1. Open SQL Editor → New query.
2. Copy the complete contents of `supabase/schema.sql` into the editor and click Run.
3. Confirm that `events`, `registrations` and `eventora_admins` were created.
4. Run the complete contents of `supabase/pricing_early_bird_migration.sql` as a second query. It creates the pricing tables and Early Bird settings.
5. Run the complete contents of `supabase/registration_intake_v1.sql` as a third query. It adds structured registration fields, segment-wise authoritative pricing, basic repeat-submission limits, and the secure `submit_eventora_registration` RPC.
6. In the SQL Editor, verify that the function `submit_eventora_registration(jsonb)` exists before enabling live registration.
7. After creating your Main Admin Auth user and adding that user to `eventora_admins`, run `supabase/role_based_access_v1.sql`. Existing `eventora_admins` entries are migrated to the `main_admin` role.
8. Sign in as Main Admin. Create the five staff Auth accounts in Supabase → Authentication → Users. In the dashboard's Staff access management panel, assign two users as `Payment Verifier` and three as `General Staff`. Use each account's Auth User UUID. The database enforces a maximum of two active verifiers and three active general staff.
9. Staff can read registration records. Only Main Admin can change participant registration status or pricing. Payment verification roles are prepared in the database, but screenshot upload/review is not live until the separate payment evidence and storage workflow is implemented and tested.

RLS is enabled. Registration rows are not publicly readable or writable. The public registration form remains a demo until the matching client-side integration is deployed and tested. The migration creates the secure database endpoint but does not by itself switch the website form to live mode.

## 3. Create your administrator account
1. Open Authentication → Users in Supabase.
2. Create/invite the email account that should administer EVENTORA.
3. Copy that user's UUID.
4. Run this in SQL Editor, replacing the example UUID with the exact user ID:

```sql
insert into public.eventora_admins (user_id)
values ('PASTE-AUTH-USER-UUID-HERE')
on conflict (user_id) do nothing;
```

Only add trusted organizers.

## 4. Configure the website
1. Copy `config.example.js` to a new file named `config.js`.
2. Replace the example URL and key with your Supabase Project URL and Publishable key.
3. Add `config.js` to the branch used to host the site.

The URL and publishable key are public browser configuration values. RLS protects the data. Never place a Secret key or service-role key in `config.js`.

## 5. Test the dashboard
Open `admin.html` on the deployed site and sign in with the administrator account. The dashboard checks `is_eventora_admin()` before showing records. Accounts not on the allow-list are signed out.

To test the table, add a sample row through the Supabase Table Editor. Do not use real participant data for testing.

## Pricing and Early Bird setup

The pricing values are seeded by `supabase/pricing_early_bird_migration.sql`. In the dashboard, the Early Bird deadline can be changed or cleared at any time. The date/time is interpreted in the admin browser's local timezone and stored as a timestamp. The current public registration form does not yet calculate or collect these fees; the migration provides the secured settings and fee schedule for the next registration-flow implementation.

## Current scope
- Admin sign-in and session persistence: implemented.
- Admin allow-list and database-side RLS: implemented in the SQL setup.
- Registration list, search, status filters and status updates: implemented.
- Pricing schedule and Early Bird deadline controls in the admin dashboard: implemented in this branch; the SQL migration must be run before they can load.
- Discount rules: 15% club-member discount or 20% Early Bird discount (Early Bird replaces the member discount; they do not stack). Membership fee is ৳100 and is separate from segment fees.
- The Early Bird deadline is admin-only; the public-facing status function returns only active/inactive, not the date.
- Event editing, password reset, audit history and exports: not yet implemented.
- Public registration writes: only through the validating `submit_eventora_registration(jsonb)` RPC; direct anonymous table inserts remain disabled. The website form still needs its client integration and end-to-end testing before real registrations.

Supabase Auth issues the session JWT. The Supabase client automatically attaches the user's access token to database requests; the application does not manually embed or handle access tokens.
