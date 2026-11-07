import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const config = window.EVENTORA_SUPABASE;
const $ = (selector) => document.querySelector(selector);
const loginPanel = $("#loginPanel"), dashboard = $("#dashboard"), message = $("#message");
let supabase = null, records = [], currentRole = null;

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = "notice" + (type ? " " + type : "");
  message.hidden = !text;
}
function showLoggedOut() { loginPanel.hidden = false; dashboard.hidden = true; }
function showDashboard(email) {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  $("#signedInAs").textContent = "Signed in as " + email;
}
async function isAdministrator() {
  const { data, error } = await supabase.rpc("is_eventora_admin");
  if (error) throw error;
  return data === true;
}
async function guardSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) { showLoggedOut(); return; }
  if (!(await isAdministrator())) {
    await supabase.auth.signOut();
    showLoggedOut();
    showMessage("This account is not authorised for the organizer dashboard.", "error");
    return;
  }
  showDashboard(session.user.email || "Administrator");
  await loadRegistrations();
}
function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
function formatTaka(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? "৳" + amount.toLocaleString("en-BD") : "—";
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}
function clubLabel(value) {
  return ({ boys: "Preparatorian Debating Club (Boys’ Wing)", girls: "MPSC Debate Club (Girls’ Wing)", none: "Not a member" })[value] || "Not specified";
}
function detailList(r) {
  const data = r.registration_data || {};
  const team = data.team || {};
  const lines = [
    ["Division", r.division || data.division || "—"],
    ["Selected segments", (r.selected_segments || data.segments || []).join(", ") || "—"],
    ["Primary club", clubLabel(data.club)],
    ["AP team name", team.teamName],
    ["AP member 2", team.member2],
    ["AP member 2 institution", team.member2Institution],
    ["AP member 2 club", team.member2Club ? clubLabel(team.member2Club) : ""],
    ["AP member 3", team.member3],
    ["AP member 3 institution", team.member3Institution],
    ["AP member 3 club", team.member3Club ? clubLabel(team.member3Club) : ""],
    ["Mystery Case teammate", team.mysteryMate],
    ["Mystery Case teammate club", team.mysteryMateClub ? clubLabel(team.mysteryMateClub) : ""]
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");
  return lines.map(([label, value]) =>
    '<div class="registration-detail-line"><strong>' + escapeHtml(label) + ':</strong> ' + escapeHtml(value) + '</div>'
  ).join("");
}
function updateCounts(list) {
  $("#totalCount").textContent = list.length;
  $("#pendingCount").textContent = list.filter(r => r.status === "pending").length;
  $("#approvedCount").textContent = list.filter(r => r.status === "approved").length;
  $("#rejectedCount").textContent = list.filter(r => r.status === "rejected").length;
}
function renderRows() {
  const query = $("#search").value.trim().toLowerCase();
  const status = $("#statusFilter").value;
  const filtered = records.filter(r => {
    const segments = (r.selected_segments || []).join(" ");
    const haystack = [r.reference, r.participant_name, r.email, r.event_name, r.institution, r.team_name, r.division, segments].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (status === "all" || r.status === status);
  });
  const tbody = $("#registrationRows");
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty">No registration records found.</td></tr>';
  } else {
    tbody.innerHTML = filtered.map(r => `<tr>
      <td><strong>${escapeHtml(r.reference)}</strong></td>
      <td>${escapeHtml(r.participant_name)}<br><span class="muted">${escapeHtml(r.email)}</span></td>
      <td>${escapeHtml(r.event_name)}</td>
      <td>${escapeHtml(r.institution || "—")}</td>
      <td><strong>${escapeHtml(r.division || "—")}</strong><br><span class="muted">${escapeHtml((r.selected_segments || []).join(", ") || "—")}</span></td>
      <td><details><summary>View details</summary><div class="registration-detail-box">${detailList(r)}</div></details></td>
      <td><strong>${formatTaka(r.total_payable)}</strong><br><span class="muted">Subtotal ${formatTaka(r.fee_subtotal)} · Discount ${formatTaka(r.discount_amount)}</span><br><span class="muted">${escapeHtml(r.discount_type || "none")}</span></td>
      <td><span class="pill ${escapeHtml(r.drive_archive_status || "not_configured")}">${escapeHtml(r.drive_archive_status || "not_configured")}</span></td>
      <td>${escapeHtml(formatDate(r.created_at))}</td>
      <td><span class="pill ${escapeHtml(r.status)}">${escapeHtml(r.status)}</span><br><div class="row-actions"><select aria-label="New status for ${escapeHtml(r.reference)}" data-status-id="${escapeHtml(r.id)}">
        <option value="pending" ${r.status === "pending" ? "selected" : ""}>Pending</option>
        <option value="approved" ${r.status === "approved" ? "selected" : ""}>Approved</option>
        <option value="rejected" ${r.status === "rejected" ? "selected" : ""}>Rejected</option>
      </select><button type="button" data-save-id="${escapeHtml(r.id)}">Save</button></div></td>
    </tr>`).join("");
  }
  $("#recordCount").textContent = `Showing ${filtered.length} of ${records.length} records`;
  updateCounts(records);
}
async function loadRegistrations() {
  $("#registrationRows").innerHTML = '<tr><td colspan="10" class="empty">Loading records…</td></tr>';
  const columns = "id,reference,participant_name,email,institution,event_name,team_name,status,created_at,division,selected_segments,registration_data,fee_subtotal,discount_type,discount_rate,discount_amount,total_payable,drive_archive_status";
  const { data, error } = await supabase.from("registrations").select(columns).order("created_at", { ascending: false }).limit(500);
  if (error) {
    showMessage("Could not load registrations: " + error.message, "error");
    $("#registrationRows").innerHTML = '<tr><td colspan="10" class="empty">Unable to load records. Check the database setup and access policies.</td></tr>';
    return;
  }
  records = data || [];
  renderRows();
  showMessage(records.length ? "" : "Your dashboard is ready. No registrations have been added yet.");
}
async function handleLogin(event) {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  button.textContent = "Signing in…";
  showMessage("");
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#password").value });
    if (error) throw error;
    await guardSession();
  } catch (error) {
    showMessage(error.message || "Sign-in failed.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Sign in securely";
  }
}
async function handleTableClick(event) {
  const button = event.target.closest("[data-save-id]");
  if (!button) return;
  const id = button.dataset.saveId;
  const select = document.querySelector(`[data-status-id="${CSS.escape(id)}"]`);
  if (!select) return;
  button.disabled = true;
  try {
    const { error } = await supabase.from("registrations").update({ status: select.value }).eq("id", id);
    if (error) throw error;
    showMessage("Registration status updated.");
    await loadRegistrations();
  } catch (error) {
    showMessage("Update failed: " + error.message, "error");
  } finally {
    button.disabled = false;
  }
}
async function init() {
  if (!config?.url || !config?.publishableKey) {
    $("#configNotice").hidden = false;
    $("#loginForm").addEventListener("submit", e => {
      e.preventDefault();
      showMessage("Add your Supabase project URL and publishable key first.", "warning");
    });
    return;
  }
  supabase = createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  $("#loginForm").addEventListener("submit", handleLogin);
  $("#signOut").addEventListener("click", async () => {
    await supabase.auth.signOut();
    showLoggedOut();
    showMessage("You have signed out.");
  });
  $("#refresh").addEventListener("click", loadRegistrations);
  $("#search").addEventListener("input", renderRows);
  $("#statusFilter").addEventListener("change", renderRows);
  $("#registrationRows").addEventListener("click", handleTableClick);\n  $("#staffRoleForm")?.addEventListener("submit", saveStaffRole);
  supabase.auth.onAuthStateChange((_event, session) => { if (!session) showLoggedOut(); });
  try { await guardSession(); }
  catch (error) { showLoggedOut(); showMessage(error.message || "Could not verify this session.", "error"); }
}
init();
