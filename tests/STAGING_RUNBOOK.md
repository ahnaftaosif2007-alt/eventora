# EVENTORA — Payment Review Staging Runbook

This runbook is for an **isolated Supabase staging project only**. Never run it against the production project.

## 0. Safety gate

- Ask the project owner / authorised adult to create a separate Supabase project named clearly as EVENTORA STAGING.
- Confirm the project ref in the dashboard is **not** the production ref.
- Use synthetic names, .invalid email addresses and QA-only references. Do not use participant personal details or a real payment reference.
- Never share or commit database passwords, Secret keys, legacy service_role keys, access tokens or OTPs.
- Keep the live website and production config.js unchanged. Do not enable public registration or the payment-submission RPC for this test.

## 1. Build the staging schema

In the staging project's SQL Editor, run the repository SQL files in this order:

1. supabase/schema.sql
2. supabase/pricing_early_bird_migration.sql
3. supabase/registration_intake_v1.sql
4. supabase/registration_pricing_sync_v1.sql
5. supabase/eventora_pricing_consent_v2.sql

Create one synthetic staging Auth user for the Main Admin. Add only that user's UUID to public.eventora_admins using the bootstrap statement in ADMIN_SETUP.md. Then run:

6. supabase/role_based_access_v1.sql
7. supabase/payment_verification_v1.sql

The order follows the migration dependencies documented in the SQL files. If any migration errors, stop and resolve it in staging; do not improvise changes on production.

## 2. Prepare isolated dashboard access

- Use staging-only Auth users.
- Sign in as the staging Main Admin and assign one staging account the Payment Verifier role.
- Keep a separate ordinary/staff test account for the permission-denied check.
- To open the dashboard against staging, use a local-only copy of the site configuration pointing to the staging Project URL and Publishable key. Do not commit this configuration and do not change the production Pages configuration.

## 3. Insert synthetic payment queue entries

After all migrations succeed, run this SQL **only in the staging SQL Editor**. It creates two fake pending registrations and two fake payment references. It does not represent real payments.

~~~sql
begin;

with seeded_registrations as (
  insert into public.registrations (
    reference, event_name, participant_name, email,
    institution, status, total_payable
  )
  values
    (
      'QA-ONLY-VER-001', 'EVENTORA QA ONLY',
      'Synthetic Verify Test', 'verify-test@example.invalid',
      'QA Sandbox', 'pending', 100
    ),
    (
      'QA-ONLY-REJ-001', 'EVENTORA QA ONLY',
      'Synthetic Reject Test', 'reject-test@example.invalid',
      'QA Sandbox', 'pending', 100
    )
  returning id, reference
),
seeded_payments as (
  insert into public.eventora_payment_submissions (
    registration_id, payment_method, transaction_reference, amount
  )
  select
    id,
    'QA Test Method',
    'QA-ONLY-TRANSACTION-' || right(reference, 3),
    100
  from seeded_registrations
  returning id
)
insert into public.eventora_payment_audit (
  submission_id, actor_user_id, action
)
select id, null, 'submitted'
from seeded_payments;

commit;
~~~

## 4. Manual dashboard test matrix

| Test | Expected result |
| --- | --- |
| Main Admin opens payment queue | Two synthetic pending rows appear |
| Payment Verifier opens payment queue | Same two rows appear |
| Verify the VER-001 record | Status changes to verified; reviewer and audit entry are recorded |
| Reject the REJ-001 record with a short note | Status changes to rejected; note and audit entry are recorded |
| Reject without a note | UI blocks the action; database RPC rejects it too |
| Review an already reviewed record again | Database RPC rejects the second review |
| Ordinary/staff account calls the queue or review RPC | Permission denied |
| Main Admin opens Payment Review Audit Log | Submission, verified and rejected audit entries are visible |

Expected audit history: two submitted entries, one verified entry and one rejected entry. Confirm that the rejection note is visible only to authorised dashboard users.

## 5. Remove staging fixtures

After recording the test results, run this cleanup **only in staging**:

~~~sql
begin;

delete from public.eventora_payment_audit
where submission_id in (
  select id
  from public.eventora_payment_submissions
  where transaction_reference like 'QA-ONLY-TRANSACTION-%'
);

delete from public.eventora_payment_submissions
where transaction_reference like 'QA-ONLY-TRANSACTION-%';

delete from public.registrations
where reference in ('QA-ONLY-VER-001', 'QA-ONLY-REJ-001');

commit;
~~~

## 6. Release gate

Passing this runbook does not automatically authorise a public launch. Before live registration/payment submission is enabled, the project owner and institution must approve participant-data handling, the privacy notice, the payment process and the final end-to-end test. Keep the public submission RPC disabled until that approval is explicit.
