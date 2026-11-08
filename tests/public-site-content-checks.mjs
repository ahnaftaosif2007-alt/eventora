import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";

const script = readFileSync("script.js", "utf8");
const html = readFileSync("index.html", "utf8");

new Script(script, { filename: "script.js" });

assert.match(script, /const ACTIVE_EVENT_ID = "inter-wing-collegiate-debate-championship"/);
assert.match(script, /date: "2026-12-13"/);
assert.match(script, /dateEnd: "2026-12-14"/);
assert.match(script, /eventStatus: "registration_setup"/);
assert.match(script, /const PUBLIC_REGISTRATION_ENABLED = false/);
assert.match(script, /function lockRegistrationPreview\(form\)/);
assert.match(script, /control.id === "fDivision"/);
assert.match(script, /control.name === "segments" && control.type === "checkbox"/);
assert.match(script, /submitButton.disabled = true/);

for (const sampleEvent of [
  "Design Thinking Workshop",
  "The Future of AI in Education",
  "Junior Science Fair 2027",
  "Community Photo Walk",
  "Autumn Mentoring Session"
]) {
  assert.ok(!script.includes(sampleEvent), `Unexpected fictional event listing: ${sampleEvent}`);
}

assert.ok(html.includes("Preparatorian Debating Club of the Bangla Version Boys’ Wing"));
assert.ok(html.includes("MPSC Debate Club of the Bangla Version Girls’ Wing"));
assert.ok(html.includes("does not accept or store registration entries"));
assert.ok(html.includes("fee-preview only"));
assert.match(html, /id="registerForm"[\s\S]*?Registration opening soon<\/button>/);
assert.ok(!html.includes("hello@example.com"));
assert.ok(!html.includes("Sample Street"));
assert.ok(!html.includes("+00 000 000 000"));
assert.ok(html.includes("Official organiser contact information"));

console.log("Public event site content checks passed.");
