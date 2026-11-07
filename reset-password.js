import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const config = window.EVENTORA_SUPABASE;
const message = document.querySelector("#resetMessage");
const panel = document.querySelector("#resetPanel");
const form = document.querySelector("#resetForm");
const submit = document.querySelector("#savePassword");
let supabase;
let recoveryReady = false;

function show(text, type = "") {
  message.textContent = text;
  message.className = "notice" + (type ? " " + type : "");
}

async function init() {
  if (!config?.url || !config?.publishableKey) {
    show("EVENTORA is not configured. Please contact the site administrator.", "error");
    return;
  }
  supabase = createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session) {
      recoveryReady = true;
      panel.hidden = false;
      show("Recovery link verified. You can now set a new password.", "success");
    }
  });

  // Supabase may finish processing the PKCE callback before the listener is attached.
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    show("This recovery link could not be verified. Request a new password reset email.", "error");
    return;
  }
  if (data.session && (window.location.search.includes("code=") || window.location.hash.includes("type=recovery"))) {
    recoveryReady = true;
    panel.hidden = false;
    show("Recovery link verified. You can now set a new password.", "success");
    return;
  }
  if (!recoveryReady) {
    show("This link is missing or expired. Return to Organizer Dashboard and request a new password reset email.", "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!recoveryReady) {
    show("Please open a valid, recent recovery email link first.", "error");
    return;
  }
  const password = document.querySelector("#newPassword").value;
  const confirmation = document.querySelector("#confirmPassword").value;
  if (password.length < 10) {
    show("Use a password with at least 10 characters.", "error");
    return;
  }
  if (password !== confirmation) {
    show("The two passwords do not match.", "error");
    return;
  }
  submit.disabled = true;
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    await supabase.auth.signOut();
    panel.hidden = true;
    show("Your password has been updated. Return to Organizer Dashboard and sign in with your new password.", "success");
  } catch (error) {
    show(error.message || "Password update failed. Request a fresh recovery link.", "error");
  } finally {
    submit.disabled = false;
  }
});

init();
