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

RLS is enabled. Registration rows are not publicly readable or writable. The existing public registration form remains a demo until a controlled submission endpoint is added.

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

## Current scope
- Admin sign-in and session persistence: implemented.
- Admin allow-list and database-side RLS: implemented in the SQL setup.
- Registration list, search, status filters and status updates: implemented.
- Event editing, password reset, audit history and exports: not yet implemented.
- Public registration writes: deliberately disabled until a protected intake flow is built.

Supabase Auth issues the session JWT. The Supabase client automatically attaches the user's access token to database requests; the application does not manually embed or handle access tokens.
