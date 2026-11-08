import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const sql = readFileSync("supabase/payment_verification_v1.sql", "utf8");
const checks = [
  ["RLS enabled on payment submissions", /alter table public\.eventora_payment_submissions enable row level security/i.test(sql)],
  ["RLS enabled on payment audit", /alter table public\.eventora_payment_audit enable row level security/i.test(sql)],
  ["Anonymous and authenticated direct table access revoked", /revoke all on public\.eventora_payment_submissions from anon, authenticated/i.test(sql) && /revoke all on public\.eventora_payment_audit from anon, authenticated/i.test(sql)],
  ["Payment submission RPC remains closed to public roles", /revoke all on function public\.submit_eventora_payment\(text,text,text,text,numeric\)\s+from public, anon, authenticated/i.test(sql)],
  ["Payment queue RPC is not executable by anon", /revoke all on function public\.eventora_get_payment_queue\(\) from public, anon/i.test(sql)],
  ["Payment review RPC is not executable by anon", /revoke all on function public\.eventora_review_payment\(uuid,text,text\) from public, anon/i.test(sql)],
  ["Queue and review functions require payment verifier role checks", (sql.match(/eventora_can_verify_payments\(\)/g) || []).length >= 2],
  ["Audit visibility is restricted to Main Admin", /using \(\(select public\.is_eventora_main_admin\(\)\)\)/i.test(sql)],
  ["Transaction references are unique without case sensitivity", /lower\(transaction_reference\)/i.test(sql)],
  ["Submission amount must be positive", /amount numeric\(10,2\) not null check \(amount > 0\)/i.test(sql)],
];

for (const [label, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"}  ${label}`);
assert.ok(checks.every(([, passed]) => passed), "One or more payment SQL contract checks failed.");
console.log(`\\n${checks.length}/${checks.length} SQL contract checks passed.`);
