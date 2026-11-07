/* =========================================================
   EVENTORA · script.js

   PART 1 · CONTENT (edit this section to change events,
            categories, announcements and site settings)
   PART 2 · APPLICATION CODE (routing, search, filters,
            form validation). Usually no need to change it.
   ========================================================= */


/* ---------------------------------------------------------
   PART 1 · CONTENT
   --------------------------------------------------------- */

const SITE_CONFIG = {
  publicUrl: "",
  organizerName: "EVENTORA"
};

const ACTIVE_EVENT_ID = "inter-wing-collegiate-debate-championship";
const CATEGORIES = ["Debate", "Competitions", "Workshops", "Talks", "Community"];

// Only the Inter-Wing Championship is currently being prepared for registration.
// Dates are confirmed; time, venue details and registration deadline will be published later.
const EVENTS = [
  {
    id: ACTIVE_EVENT_ID,
    title: "The Inter-Wing Collegiate Debate Championship",
    category: "Debate",
    featured: true,
    date: "2026-12-13",
    dateEnd: "2026-12-14",
    time: "To be announced",
    venue: "To be announced",
    address: "Venue details will be announced by the organisers.",
    fee: "See segment-wise fee schedule",
    capacity: null,
    deadline: null,
    eventStatus: "registration_setup",
    summary: "A collegiate debate championship organised by the Bangla Version Boys and Bangla Version Girls debating wings of MPSC.",
    description: "The Inter-Wing Collegiate Debate Championship will take place on 13–14 December 2026. Further details, including the venue, schedule, rules and registration instructions, will be published here.",
    rules: [
      "The final event rules and eligibility criteria will be published before registration opens.",
      "Participants must follow the official schedule and instructions issued by the organisers."
    ]
  },
  ...[
    ["design-thinking-workshop", "Design Thinking Workshop", "Workshops", "2027-01-23"],
    ["ai-in-education-talk", "The Future of AI in Education", "Talks", "2027-02-06"],
    ["science-fair-2027", "Junior Science Fair 2027", "Competitions", "2027-02-20"],
    ["community-photo-walk", "Community Photo Walk", "Community", "2027-03-06"],
    ["autumn-mentoring-session", "Autumn Mentoring Session", "Workshops", "2026-11-21"]
  ].map(([id, title, category, date]) => ({
    id, title, category, date, featured: false,
    time: "To be announced",
    venue: "To be announced",
    address: "Details will be announced later.",
    fee: "To be announced",
    capacity: null,
    deadline: null,
    eventStatus: "under_construction",
    summary: "This event page is being prepared. Details will be published later.",
    description: "Information about this event is currently under construction.",
    rules: []
  }))
];

const ANNOUNCEMENTS = [
  {
    id: "a1",
    date: "2026-11-07",
    tag: "Event Update",
    title: "The Inter-Wing Collegiate Debate Championship is scheduled for 13–14 December 2026",
    body: "Event information and registration details will be published on EVENTORA as they are finalised."
  }
];


/* ---------------------------------------------------------
   PART 2 · APPLICATION CODE
   --------------------------------------------------------- */

/* ----- Small helpers ----- */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

// Protects against accidental HTML injection when inserting text.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

// Parses YYYY-MM-DD as a local date (avoids timezone shifts).
function parseDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(iso, options) {
  const opts = options || { weekday: "short", day: "numeric", month: "short", year: "numeric" };
  return parseDate(iso).toLocaleDateString(undefined, opts);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysUntil(iso) {
  return Math.ceil((parseDate(iso) - startOfToday()) / 86400000);
}

// Returns the registration status text and whether registration is open.
function eventStatus(ev) {
  if (ev.eventStatus === "under_construction") return { open: false, text: "Under Construction", label: "Under Construction" };
  if (ev.eventStatus === "registration_setup") return { open: false, text: "Registration opening soon", label: "Registration opening soon" };
  if (!ev.deadline) return { open: false, text: "Details to be announced", label: "Details to be announced" };
  const days = daysUntil(ev.deadline);
  if (days < 0) return { open: false, text: "Registration closed", label: "Registration closed" };
  if (days === 0) return { open: true, text: "Closes today", label: "Registration open" };
  if (days <= 7) return { open: true, text: `Closes in ${days} day${days === 1 ? "" : "s"}`, label: "Registration open" };
  return { open: true, text: `Closes ${formatDate(ev.deadline)}`, label: "Registration open" };
}

function displayEventDate(ev) {
  return ev.dateEnd
    ? `${formatDate(ev.date, { day: "numeric", month: "short" })} – ${formatDate(ev.dateEnd)}`
    : formatDate(ev.date);
}

function registerButton(ev, className) {
  const status = eventStatus(ev);
  if (ev.id !== ACTIVE_EVENT_ID || !status.open) {
    const label = ev.eventStatus === "under_construction" ? "Under Construction" : "Registration opening soon";
    return `<button class="${className}" type="button" disabled>${label}</button>`;
  }
  return `<a class="${className}" href="#register?event=${encodeURIComponent(ev.id)}">Register</a>`;
}

/* ----- DOM references ----- */
const views = $$("[data-view]");
const NAV_KEY = {
  home: "home",
  events: "events",
  event: "events",
  announcements: "announcements",
  about: "about",
  contact: "contact",
  id: "id",
  share: "share"
};
const ROUTE_TITLES = {
  home: "Home",
  events: "Events",
  event: "Event details",
  register: "Register",
  success: "Registration (demo)",
  announcements: "Updates",
  about: "About",
  contact: "Contact",
  id: "Digital ID preview",
  share: "QR code & link"
};
const VALID_ROUTES = Object.keys(ROUTE_TITLES);

const state = { q: "", category: "All", sort: "date" };
let lastDemo = null; // Demo submission kept in memory only. Never stored or sent.

/* ----- Card and content templates ----- */
function eventCard(ev) {
  const status = eventStatus(ev);
  const detailHref = `#event/${encodeURIComponent(ev.id)}`;
  return `
    <article class="card">
      <div class="card-media" data-cat="${escapeHtml(ev.category)}">
        <span>${escapeHtml(ev.category)}</span>
        <em class="sample-badge">${escapeHtml(status.label)}</em>
      </div>
      <div class="card-body">
        <p class="card-meta">${escapeHtml(displayEventDate(ev))} · ${escapeHtml(ev.venue)}</p>
        <h3><a href="${detailHref}">${escapeHtml(ev.title)}</a></h3>
        <p>${escapeHtml(ev.summary)}</p>
        <p class="status ${status.open ? "open" : "closed"}">${escapeHtml(status.text)}</p>
      </div>
      <div class="card-actions">
        <a class="text-link" href="${detailHref}">View details</a>
        ${registerButton(ev, "btn btn-small btn-gold")}
      </div>
    </article>`;
}

function announcementItem(a) {
  return `
    <article class="announce">
      <time datetime="${escapeHtml(a.date)}">${escapeHtml(formatDate(a.date, { day: "numeric", month: "short", year: "numeric" }))}</time>
      <div>
        <span class="tag">${escapeHtml(a.tag)}</span>
        <h3>${escapeHtml(a.title)}</h3>
        <p>${escapeHtml(a.body)}</p>
      </div>
    </article>`;
}

/* ----- Home page ----- */
function renderHome() {
  const featured = EVENTS.filter((ev) => ev.featured).slice(0, 3);
  $("#featuredGrid").innerHTML = featured.map(eventCard).join("");
  $("#homeAnnouncements").innerHTML = sortedAnnouncements().slice(0, 2).map(announcementItem).join("");
}

function sortedAnnouncements() {
  return ANNOUNCEMENTS.slice().sort((a, b) => b.date.localeCompare(a.date));
}

function renderAnnouncements() {
  $("#announcementList").innerHTML = sortedAnnouncements().map(announcementItem).join("");
}

/* ----- Events page: chips, search, filter, sort ----- */
function buildChips() {
  const all = ["All", ...CATEGORIES];
  $("#chipList").innerHTML = all
    .map((c) => `<button type="button" class="chip" data-cat="${escapeHtml(c)}" aria-pressed="${state.category === c}">${escapeHtml(c)}</button>`)
    .join("");
}

function renderEvents() {
  const q = state.q.toLowerCase();

  let list = EVENTS.filter((ev) => {
    const inCategory = state.category === "All" || ev.category === state.category;
    const haystack = [ev.title, ev.summary, ev.description, ev.venue, ev.category].join(" ").toLowerCase();
    return inCategory && (!q || haystack.includes(q));
  });

  list = list.slice().sort((a, b) => {
    if (state.sort === "title") return a.title.localeCompare(b.title);
    if (state.sort === "deadline") return a.deadline.localeCompare(b.deadline);
    return a.date.localeCompare(b.date);
  });

  $("#eventGrid").innerHTML = list.map(eventCard).join("");
  const count = list.length;
  const suffix = state.q ? ` for "${state.q}"` : "";
  $("#resultsCount").textContent = `${count} ${count === 1 ? "event" : "events"} found${suffix}`;
  $("#emptyState").hidden = count !== 0;
}

/* ----- Event detail page ----- */
function renderDetail(id) {
  const box = $("#eventDetail");
  const ev = EVENTS.find((e) => e.id === id);

  if (!ev) {
    box.innerHTML = `
      <div class="empty">
        <h2>Event not found</h2>
        <p>This event may have been removed, or the link is incorrect.</p>
        <a class="btn btn-navy" href="#events">Back to events</a>
      </div>`;
    return;
  }

  const status = eventStatus(ev);
  const paragraphs = ev.description
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .join("");
  const rules = ev.rules.map((r) => `<li>${escapeHtml(r)}</li>`).join("");

  box.innerHTML = `
    <a class="back-link text-link" href="#events">? Back to events</a>
    <article class="detail">
      <header class="detail-head">
        <span class="sample-badge sample-tag">${escapeHtml(status.label)}</span>
        <p class="eyebrow">${escapeHtml(ev.category)}</p>
        <h1>${escapeHtml(ev.title)}</h1>
        <p>${escapeHtml(ev.summary)}</p>
      </header>

      <div class="detail-body">
        <ul class="facts">
          <li><span>Date</span><strong>${escapeHtml(displayEventDate(ev))}</strong></li>
          <li><span>Time</span><strong>${escapeHtml(ev.time)}</strong></li>
          <li><span>Venue</span><strong>${escapeHtml(ev.venue)}</strong></li>
          <li><span>Fee</span><strong>${escapeHtml(ev.fee)}</strong></li>
          ${ev.capacity ? `<li><span>Capacity</span><strong>${ev.capacity} places</strong></li>` : ""}
        </ul>

        <div class="deadline-box">
          <strong>Event status:</strong>
          <span class="status ${status.open ? "open" : "closed"}">${escapeHtml(status.text)}</span>
        </div>

        <h2>About this event</h2>
        ${paragraphs}

        ${rules ? `<h2>Rules &amp; eligibility</h2><ol class="rules">${rules}</ol>` : ""}

        <p class="note">Address: ${escapeHtml(ev.address)}</p>

        <div class="detail-actions">
          ${registerButton(ev, "btn btn-gold")}
          <a class="btn btn-ghost" href="#events">Browse more events</a>
        </div>
      </div>
    </article>`;
}

/* ----- Event-specific registration preview ----- */
const SEGMENT_FEES = {
  "AP Debate": { C: 1200 },
  "Debate IQ Quiz": { A: 50, B: 70, C: 70 },
  "Movie Quiz": { A: 50, B: 70, C: 70 },
  "Mystery Case Challenge": { A: 140, B: 200, C: 200 },
  "Creative Arguments": { A: 70, B: 100, C: 100 },
  "This or That": { A: 70, B: 100, C: 100 },
  "Extempore Speech": { A: 100, B: 150, C: 150 },
  "Baroari Debate": { A: 100, B: 150, C: 150 }
};
const CLUB_VALUES = ["boys", "girls"];

function populateEventOptions() {
  // Only the Inter-Wing Championship is being prepared for registration.
}

function prepareRegister() {
  const form = $("#registerForm");
  if (!form) return;
  $("#formError").hidden = true;
  $("#formError").textContent = "";
  form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
  updateRegistrationFields();
}

function setFieldsetActive(id, active) {
  const fieldset = document.getElementById(id);
  fieldset.hidden = !active;
  fieldset.disabled = !active;
}

function updateRegistrationFields() {
  const division = $("#fDivision").value;
  const segment = $("#fSegment").value;
  const apOption = Array.from($("#fSegment").options).find((option) => option.value === "AP Debate");
  apOption.disabled = division !== "C";

  if (segment === "AP Debate" && division !== "C") {
    $("#fSegment").value = "";
  }

  const selected = $("#fSegment").value;
  const isAP = selected === "AP Debate";
  const isMystery = selected === "Mystery Case Challenge";
  setFieldsetActive("apTeamFields", isAP);
  setFieldsetActive("mysteryFields", isMystery);

  if (isAP) {
    $("#participantHeading").textContent = "Team contact · Member 1";
    $("#participantHelp").textContent = "Enter the first member's details. Add the other two members below. AP Debate is available only in Division C.";
  } else if (isMystery) {
    $("#participantHeading").textContent = "Primary registrant";
    $("#participantHelp").textContent = "Enter your details as the team's primary contact. Add only your teammate's name and club membership below.";
  } else {
    $("#participantHeading").textContent = "Participant details";
    $("#participantHelp").textContent = "Solo segments accept one participant per registration. Register separately for each additional solo segment.";
  }
  updateFeePreview();
}

function roundTaka(amount) {
  return Math.floor(amount + 0.5);
}

function updateFeePreview() {
  const division = $("#fDivision").value;
  const segment = $("#fSegment").value;
  const feeLine = $("#feePreview");
  if (!division || !segment) {
    feeLine.textContent = "Choose a division and segment to see the fee.";
    return;
  }
  const base = SEGMENT_FEES[segment]?.[division];
  if (typeof base !== "number") {
    feeLine.textContent = segment === "AP Debate"
      ? "AP Debate is available only in Division C."
      : "Fee information is not available for this selection.";
    return;
  }

  const clubSelections = [$("#fClub").value];
  if (segment === "AP Debate") {
    clubSelections.push($("#fMember2Club").value, $("#fMember3Club").value);
  } else if (segment === "Mystery Case Challenge") {
    clubSelections.push($("#fMysteryMateClub").value);
  }
  const hasClubMember = clubSelections.some((value) => CLUB_VALUES.includes(value));
  const discounted = hasClubMember ? roundTaka(base * 0.85) : base;
  const unit = segment === "AP Debate" || segment === "Mystery Case Challenge" ? "per team" : "per participant";
  feeLine.textContent = hasClubMember
    ? `৳${base.toLocaleString("en-BD")} ${unit} · Club Member fee: ৳${discounted.toLocaleString("en-BD")}`
    : `৳${base.toLocaleString("en-BD")} ${unit}`;
}

function makeReference() {
  return "DEMO-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function setupRegistrationForm() {
  const form = $("#registerForm");
  if (!form) return;

  form.addEventListener("change", (e) => {
    if (["division", "segment", "club", "member2Club", "member3Club", "mysteryMateClub"].includes(e.target.name)) {
      updateRegistrationFields();
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const formError = $("#formError");
    formError.hidden = true;

    const invalid = Array.from(form.elements).find((el) =>
      el.willValidate && !el.checkValidity()
    );
    const division = $("#fDivision");
    const segment = $("#fSegment");
    if (segment.value === "AP Debate" && division.value !== "C") {
      division.setCustomValidity("AP Debate is available only in Division C.");
    } else {
      division.setCustomValidity("");
    }

    const firstInvalid = Array.from(form.elements).find((el) =>
      el.willValidate && !el.checkValidity()
    ) || invalid;

    if (firstInvalid) {
      firstInvalid.setAttribute("aria-invalid", "true");
      formError.textContent = firstInvalid.validationMessage || "Please complete the highlighted fields.";
      formError.hidden = false;
      firstInvalid.focus();
      return;
    }

    const event = EVENTS.find((item) => item.id === ACTIVE_EVENT_ID);
    lastDemo = {
      name: $("#fName").value.trim(),
      eventTitle: event ? event.title : "The Inter-Wing Collegiate Debate Championship",
      eventDate: event ? formatDate(event.date) : "13–14 December 2026",
      ref: makeReference()
    };

    form.reset();
    prepareRegister();
    location.hash = "#success";
  });
}

function renderSuccess() {
  if (!lastDemo) return;
  $("#successName").textContent = lastDemo.name;
  $("#successRef").textContent = lastDemo.ref;
  $("#successEvent").textContent = lastDemo.eventTitle;
  $("#successDate").textContent = lastDemo.eventDate;
}

/* ----- QR and share page ----- */
function shareUrl() {
  if (SITE_CONFIG.publicUrl) return SITE_CONFIG.publicUrl;
  if (location.protocol.startsWith("http")) return location.origin + location.pathname;
  return "https://your-username.github.io/eventora/";
}

function renderShare() {
  $("#publicUrlText").textContent = shareUrl();
}

function setupShare() {
  const qrImg = $("#qrImg");
  const showQr = () => {
    qrImg.hidden = false;
    $("#qrFallback").hidden = true;
  };
  qrImg.addEventListener("load", showQr);
  // If the image was already loaded before this script ran, show it now.
  if (qrImg.complete && qrImg.naturalWidth > 0) showQr();

  $("#copyLink").addEventListener("click", async () => {
    const status = $("#copyStatus");
    try {
      await navigator.clipboard.writeText(shareUrl());
      status.textContent = "Link copied to your clipboard.";
    } catch (err) {
      status.textContent = "Copying is not available here. Select the link above and copy it manually.";
    }
  });
}

/* ----- Router: shows one view at a time based on the URL hash ----- */
function getRoute() {
  const raw = location.hash.replace(/^#/, "");
  const [pathPart, queryPart = ""] = raw.split("?");
  const [name, param = ""] = pathPart.split("/");
  let decodedParam = "";
  try {
    decodedParam = decodeURIComponent(param);
  } catch (err) {
    decodedParam = "";
  }
  return {
    name: VALID_ROUTES.includes(name) ? name : "home",
    param: decodedParam,
    query: new URLSearchParams(queryPart)
  };
}

function render() {
  const route = getRoute();

  // Success is only valid right after a demo submission.
  if (route.name === "success" && !lastDemo) {
    location.hash = "#register";
    return;
  }

  views.forEach((view) => {
    view.hidden = view.dataset.view !== route.name;
  });

  const navKey = NAV_KEY[route.name];
  $$("[data-nav]").forEach((link) => {
    const active = link.dataset.nav === navKey;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  if (route.name === "home") renderHome();
  if (route.name === "events") renderEvents();
  if (route.name === "event") renderDetail(route.param);
  if (route.name === "register") prepareRegister(route.query.get("event"));
  if (route.name === "success") renderSuccess();
  if (route.name === "share") renderShare();

  document.title = `${ROUTE_TITLES[route.name]} · EVENTORA`;
  closeMenu();
  window.scrollTo(0, 0);
  $("#main").focus({ preventScroll: true });
}

/* ----- Mobile navigation ----- */
const navToggle = $("#navToggle");
const primaryNav = $("#primaryNav");

function closeMenu() {
  primaryNav.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Open menu");
}

function setupNav() {
  navToggle.addEventListener("click", () => {
    const open = primaryNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && primaryNav.classList.contains("open")) {
      closeMenu();
      navToggle.focus();
    }
  });
}

/* ----- Events page listeners ----- */
function setupEventsPage() {
  $("#searchInput").addEventListener("input", (e) => {
    state.q = e.target.value.trim();
    renderEvents();
  });

  $("#sortSelect").addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderEvents();
  });

  $("#chipList").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    state.category = chip.dataset.cat;
    buildChips();
    renderEvents();
  });

  $("#resetFilters").addEventListener("click", () => {
    state.q = "";
    state.category = "All";
    state.sort = "date";
    $("#searchInput").value = "";
    $("#sortSelect").value = "date";
    buildChips();
    renderEvents();
  });

  $("#filterForm").addEventListener("submit", (e) => e.preventDefault());
}

/* ----- Start the application ----- */
function init() {
  $("#statEvents").textContent = EVENTS.length;
  $("#statCategories").textContent = CATEGORIES.length;
  $("#year").textContent = new Date().getFullYear();

  buildChips();
  populateEventOptions();
  renderAnnouncements();

  setupNav();
  setupEventsPage();
  setupRegistrationForm();
  setupShare();

  window.addEventListener("hashchange", render);
  render();
}

init();