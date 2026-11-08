import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";

const html=readFileSync("test.html","utf8");
const js=readFileSync("test.js","utf8");
const adminHtml=readFileSync("admin.html","utf8");
const adminJs=readFileSync("admin.js","utf8");
const migration=readFileSync("supabase/test_mode_hardening_v1.sql","utf8");
const app=readFileSync("script.js","utf8");
new Script(js.replace(/^import .*;\s*/m,""),{filename:"test.js"});

const checks=[
 ["Public test page is clearly labelled TEST",/PUBLIC SANDBOX|EVENTORA Test Mode/.test(html)],
 ["Public test page collects no names, emails, phone numbers or personal information",!/type="email"|autocomplete="name"|name="participantName"/i.test(html)],
 ["Public test page warns no real payment is accepted",/NO REAL PAYMENT/.test(html)],
 ["Public test registration calls only the isolated TEST RPC",/eventora_public_test_register/.test(js)],
 ["Public test payment calls only the isolated TEST payment RPC",/eventora_public_test_payment/.test(js)],
 ["Test payment method options are explicitly dummy",/Test bKash/.test(html)&&/Test Nagad/.test(html)&&/Test Bank/.test(html)],
 ["Dummy transaction references must use TEST-TXN prefix",/TEST-TXN-/.test(html)&&/TEST-TXN-/.test(migration)],
 ["Test page shows QR token and locally renders QR",/test_token/.test(js)&&/new QRCode/.test(js)],
 ["Organizer dashboard has isolated TEST queue",/testModePanel/.test(adminHtml)&&/testQueueRows/.test(adminHtml)],
 ["Organizer dashboard uses test review RPC",/eventora_review_test_payment/.test(adminJs)],
 ["Organizer dashboard uses test-only check-in RPC",/eventora_test_checkin/.test(adminJs)],
 ["Public test register RPC is explicitly granted to anon",/grant execute on function public\.eventora_public_test_register\(text,text\[\]\) to anon, authenticated/i.test(migration)],
 ["Test review queue is authenticated only",/revoke all on function public\.eventora_get_test_queue\(\) from public, anon/i.test(migration)],
 ["Test check-in requires authenticated role grant",/grant execute on function public\.eventora_test_checkin\(uuid\) to authenticated/i.test(migration)],
 ["Test registration function inserts only into test table",/insert into public\.eventora_test_registrations/.test(migration)&&!/insert into public\.registrations\s*\(/i.test(migration)],
 ["Official public registration remains disabled",/const PUBLIC_REGISTRATION_ENABLED = false/.test(app)]
];
for(const [label,ok] of checks) console.log(`${ok?"PASS":"FAIL"}  ${label}`);
assert.ok(checks.every(([,ok])=>ok),"One or more public test-mode checks failed.");
console.log(`\\n${checks.length}/${checks.length} public test-mode checks passed.`);
