import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const config = window.EVENTORA_SUPABASE;
const $ = (selector) => document.querySelector(selector);
const pricingPanel = $("#pricingPanel");
const pricingMessage = $("#pricingMessage");
let pricingClient = null;

function pricingNotice(text, type = "") {
  pricingMessage.textContent = text;
  pricingMessage.className = "notice" + (type ? " " + type : "");
  pricingMessage.hidden = !text;
}

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function escapePriceText(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function renderPriceRows(rows) {
  const body = $("#priceRows");
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="3" class="empty">No segment prices found.</td></tr>';
    return;
  }
  const names = { A: "Division A · Class 5–7", B: "Division B · Class 8–10", C: "Division C · Class 11–12" };
  const sorted = [...rows].sort((a,b) => a.segment.localeCompare(b.segment) || a.division.localeCompare(b.division));
  body.innerHTML = sorted.map(row => `<tr>
    <td>${escapePriceText(row.segment)}</td>
    <td>${names[row.division] || escapePriceText(row.division)}</td>
    <td>৳${Number(row.price).toLocaleString("en-BD")}</td>
  </tr>`).join("");
}

async function loadPricingSettings() {
  const [{ data: settings, error: settingsError }, { data: prices, error: pricesError }] = await Promise.all([
    pricingClient.from("eventora_settings").select("early_bird_deadline,club_member_discount,early_bird_discount,membership_fee").eq("id", 1).single(),
    pricingClient.from("event_segment_prices").select("segment,division,price")
  ]);
  if (settingsError) throw settingsError;
  if (pricesError) throw pricesError;

  $("#earlyBirdDeadline").value = toLocalInput(settings.early_bird_deadline);
  $("#memberDiscount").textContent = Number(settings.club_member_discount) + "%";
  $("#earlyBirdDiscount").textContent = Number(settings.early_bird_discount) + "%";
  $("#membershipFee").textContent = "৳" + Number(settings.membership_fee).toLocaleString("en-BD");
  renderPriceRows(prices || []);
  const active = settings.early_bird_deadline && new Date() < new Date(settings.early_bird_deadline);
  $("#earlyBirdStatus").textContent = active ? "Active" : "Inactive";
  $("#earlyBirdStatus").className = "status-value " + (active ? "active" : "inactive");
}

async function savePricingSettings(event) {
  event.preventDefault();
  const button = $("#savePricing");
  const value = $("#earlyBirdDeadline").value;
  if (!value) {
    pricingNotice("Choose a deadline, or use Clear deadline to turn Early Bird off.", "warning");
    return;
  }
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) {
    pricingNotice("Please enter a valid date and time.", "error");
    return;
  }
  button.disabled = true;
  button.textContent = "Saving…";
  try {
    const { error } = await pricingClient.from("eventora_settings")
      .update({ early_bird_deadline: deadline.toISOString(), updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw error;
    await loadPricingSettings();
    pricingNotice("Early Bird deadline saved. The public site receives only the active/inactive status.");
  } catch (error) {
    pricingNotice("Could not save settings: " + error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Save deadline";
  }
}

async function clearPricingDeadline() {
  const button = $("#clearEarlyBird");
  button.disabled = true;
  try {
    const { error } = await pricingClient.from("eventora_settings")
      .update({ early_bird_deadline: null, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw error;
    await loadPricingSettings();
    pricingNotice("Early Bird is now inactive. No deadline is set.");
  } catch (error) {
    pricingNotice("Could not clear deadline: " + error.message, "error");
  } finally {
    button.disabled = false;
  }
}

async function initPricingPanel() {
  if (!config?.url || !config?.publishableKey) return;
  pricingClient = createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const { data: { session } } = await pricingClient.auth.getSession();
  if (!session) return;
  const { data: isAdmin, error: adminError } = await pricingClient.rpc("is_eventora_main_admin");
  if (adminError || isAdmin !== true) return;

  pricingPanel.hidden = false;
  $("#earlyBirdForm").addEventListener("submit", savePricingSettings);
  $("#clearEarlyBird").addEventListener("click", clearPricingDeadline);
  try {
    await loadPricingSettings();
  } catch (error) {
    pricingNotice("Pricing settings are not ready. Run the pricing migration in Supabase SQL Editor. " + error.message, "error");
  }
}

initPricingPanel();