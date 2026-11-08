import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const app = readFileSync("script.js", "utf8");
const html = readFileSync("index.html", "utf8");
const paymentSql = readFileSync("supabase/payment_verification_v1.sql", "utf8");
const pricingSql = readFileSync("supabase/eventora_pricing_consent_v2.sql", "utf8");

const checks = [
  ["Public registration stays disabled in the frontend", /const PUBLIC_REGISTRATION_ENABLED = false/.test(app)],
  ["Form submit handler prevents default browser submission", /form\.addEventListener\("submit", async \(e\) => \{\s*e\.preventDefault\(\)/.test(app)],
  ["Submit handler exits before sending data while registration is closed", /if \(!PUBLIC_REGISTRATION_ENABLED\)\s*\{[\s\S]{0,350}?return;/.test(app)],
  ["Division and segment changes refresh registration fields and fee preview", /form\.addEventListener\("change",[\s\S]{0,250}?updateRegistrationFields\(\)/.test(app)],
  ["Fee preview recalculates after live pricing loads", /liveEarlyBirdActive = pricing\.early_bird_active === true;\s*updateFeePreview\(\)/.test(app)],
  ["Fee preview applies membership fee only for a selected primary club", /const membershipFee = CLUB_VALUES\.includes\(\$\("#fClub"\)\.value\) \? liveMembershipFee : 0/.test(app)],
  ["Early Bird discount takes precedence over club discount", /liveEarlyBirdActive \? liveEarlyBirdDiscountRate : \(hasClubMember \? liveClubDiscountRate : 0\)/.test(app)],
  ["AP Debate is limited to Division C in the UI", /apOption\.disabled = division !== "C"/.test(app)],
  ["AP and Mystery Case team fields are conditionally enabled", /setFieldsetActive\("apTeamFields", isAP\)/.test(app) && /setFieldsetActive\("mysteryFields", isMystery\)/.test(app)],
  ["Registration form warns users not to submit before official opening", /Registration is not open yet/.test(html)],
  ["Server calculates registration total rather than trusting a browser total", /v_total := v_subtotal - v_discount;[\s\S]{0,1000}?return pg_catalog\.jsonb_build_object\([\s\S]{0,300}?v_total/.test(pricingSql)],
  ["Public payment submission remains ungranted", /revoke all on function public\.submit_eventora_payment\(text,text,text,text,numeric\)\s+from public, anon, authenticated/i.test(paymentSql)]
];

for (const [label, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"}  ${label}`);
assert.ok(checks.every(([, passed]) => passed), "One or more registration/payment integration contract checks failed.");
console.log(`\\n${checks.length}/${checks.length} integration contract checks passed.`);
