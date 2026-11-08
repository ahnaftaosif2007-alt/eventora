import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const admin = readFileSync("admin.js", "utf8");
const migration = readFileSync("supabase/payment_verification_v1.sql", "utf8");

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `Missing section: ${start}`);
  const to = end ? source.indexOf(end, from + start.length) : source.length;
  return source.slice(from, to === -1 ? source.length : to);
}

const review = section(
  migration,
  "create or replace function public.eventora_review_payment(",
  "-- Never expose the participant submission RPC"
);
const handler = section(admin, "async function handlePaymentReview(event)", "async function loadPaymentAudit()");

const checks = [
  ["review RPC checks verifier permission", /eventora_can_verify_payments\(\)/.test(review)],
  ["review RPC accepts only verified/rejected", /p_decision not in \('verified','rejected'\)/.test(review)],
  ["rejection requires a note", /p_decision = 'rejected' and v_note is null/.test(review)],
  ["review note is capped at 500 characters", /length\(v_note\) > 500/.test(review)],
  ["only pending submissions can be changed", /and status = 'submitted'/.test(review)],
  ["review records the authenticated reviewer", /reviewed_by = \(select auth\.uid\(\)\)/.test(review)],
  ["review writes an audit entry", /insert into public\.eventora_payment_audit/.test(review)],
  ["UI requires a reason before rejection", /decision === "rejected" && !note/.test(handler)],
  ["UI asks for confirmation", /window\.confirm\(/.test(handler)],
  ["UI calls the review RPC", /supabase\.rpc\("eventora_review_payment"/.test(handler)],
  ["UI reloads the payment queue", /await loadPaymentQueue\(\)/.test(handler)],
  ["Main Admin UI refreshes the audit log", /currentRole === "main_admin"\) await loadPaymentAudit\(\)/.test(handler)],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}  ${label}`);
}
assert.ok(checks.every(([, passed]) => passed), "One or more payment-review source checks failed.");
console.log(`\\n${checks.length}/${checks.length} source checks passed.`);
