import assert from "node:assert/strict";

// Dependency-free model tests for the payment review contract.
// These tests exercise expected state transitions without connecting to Supabase.
function reviewPayment({ role, row, decision, note = null }) {
  if (!["main_admin", "payment_verifier"].includes(role)) {
    throw new Error("unauthorised");
  }
  if (!row || !["verified", "rejected"].includes(decision)) {
    throw new Error("invalid decision");
  }
  const cleanNote = typeof note === "string" ? note.trim() : "";
  if (decision === "rejected" && !cleanNote) {
    throw new Error("rejection note required");
  }
  if (cleanNote.length > 500) throw new Error("note too long");
  if (row.status !== "submitted") throw new Error("not awaiting review");

  // Model an atomic transaction: mutate state and append audit only after validation.
  const updated = { ...row, status: decision, reviewer: "test-reviewer", note: cleanNote || null };
  const audit = { action: decision, note: cleanNote || null };
  return { row: updated, audit };
}

const tests = [
  ["Main Admin can verify a pending submission", () => {
    const result = reviewPayment({ role: "main_admin", row: { status: "submitted" }, decision: "verified" });
    assert.equal(result.row.status, "verified");
    assert.equal(result.audit.action, "verified");
  }],
  ["Payment Verifier can reject with a reason", () => {
    const result = reviewPayment({ role: "payment_verifier", row: { status: "submitted" }, decision: "rejected", note: "Reference could not be matched" });
    assert.equal(result.row.status, "rejected");
    assert.equal(result.audit.note, "Reference could not be matched");
  }],
  ["General Staff cannot review payments", () => {
    assert.throws(() => reviewPayment({ role: "staff", row: { status: "submitted" }, decision: "verified" }), /unauthorised/);
  }],
  ["Unauthenticated role cannot review payments", () => {
    assert.throws(() => reviewPayment({ role: null, row: { status: "submitted" }, decision: "verified" }), /unauthorised/);
  }],
  ["Reject without a note is blocked", () => {
    assert.throws(() => reviewPayment({ role: "payment_verifier", row: { status: "submitted" }, decision: "rejected" }), /note required/);
  }],
  ["Whitespace-only rejection note is blocked", () => {
    assert.throws(() => reviewPayment({ role: "payment_verifier", row: { status: "submitted" }, decision: "rejected", note: "   " }), /note required/);
  }],
  ["Review note over 500 characters is blocked", () => {
    assert.throws(() => reviewPayment({ role: "main_admin", row: { status: "submitted" }, decision: "verified", note: "x".repeat(501) }), /too long/);
  }],
  ["Unknown decision is blocked", () => {
    assert.throws(() => reviewPayment({ role: "main_admin", row: { status: "submitted" }, decision: "approved" }), /invalid decision/);
  }],
  ["Already reviewed payment cannot be reviewed twice", () => {
    assert.throws(() => reviewPayment({ role: "main_admin", row: { status: "verified" }, decision: "rejected", note: "second attempt" }), /not awaiting review/);
  }],
  ["Missing submission is blocked", () => {
    assert.throws(() => reviewPayment({ role: "main_admin", row: null, decision: "verified" }), /invalid decision/);
  }],
  ["Successful review records reviewer and audit action together", () => {
    const result = reviewPayment({ role: "main_admin", row: { status: "submitted" }, decision: "verified" });
    assert.equal(result.row.reviewer, "test-reviewer");
    assert.equal(result.audit.action, result.row.status);
  }],
];

for (const [name, run] of tests) {
  run();
  process.stdout.write(`PASS  ${name}\n`);
}
process.stdout.write(`\n${tests.length}/${tests.length} behavior-model tests passed.\n`);
