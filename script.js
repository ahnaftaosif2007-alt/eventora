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
  // After publishing, paste your public address here, for example:
  // "https://your-username.github.io/eventora/"
  // Leave it empty to use the address the page is opened from.
  publicUrl: "",
  organizerName: "Sample Organizing Team"
};

// Category names used for filter buttons. Each event's "category" must match one of these.
const CATEGORIES = ["Competitions", "Debate", "Workshops", "Talks", "Community"];

// SAMPLE EVENTS. All content is fictional and clearly marked as sample.
// To add an event, copy one block, change the values, and keep the commas.
// Dates use the format YYYY-MM-DD.
const EVENTS = [
  {
    id: "debate-championship-2027",
    title: "Inter-School Debate Championship 2027",
    category: "Debate",
    featured: true,
    date: "2027-01-16",
    time: "09:00 – 17:00",
    venue: "Sample Main Auditorium",
    address: "Placeholder address, Sample City",
    fee: "Free (sample)",
    capacity: 120,
    deadline: "2027-01-05",
    summary: "A full day of British Parliamentary debates for school teams, with three preliminary rounds and a final.",
    description:
      "Teams of two debate a new motion in each round. Judges score argument, rebuttal and clarity.\n\nAll participants receive a certificate of participation, and the final is open to observers.",
    rules: [
      "Teams consist of two students from the same institution.",
      "Each team must arrive 30 minutes before its first round.",
      "Judges' decisions are final on the day.",
      "Mobile phones must be switched off in debating rooms."
    ]
  },
  {
    id: "design-thinking-workshop",
    title: "Design Thinking Workshop",
    category: "Workshops",
    featured: true,
    date: "2027-01-23",
    time: "10:00 – 13:00",
    venue: "Sample Innovation Lab",
    address: "Placeholder address, Sample City",
    fee: "Free (sample)",
    capacity: 40,
    deadline: "2027-01-18",
    summary: "A hands-on session on empathy, problem framing and rapid prototyping using paper and sticky notes.",
    description:
      "Participants work in small groups to understand a real-world problem from a user's point of view, then sketch and test a simple prototype.\n\nNo design experience is needed.",
    rules: [
      "Open to students aged 15 and above.",
      "Bring a notebook and a pen. Materials are provided.",
      "Groups are formed on arrival."
    ]
  },
  {
    id: "ai-in-education-talk",
    title: "The Future of AI in Education",
    category: "Talks",
    featured: true,
    date: "2027-02-06",
    time: "18:00 – 19:30",
    venue: "Sample Lecture Hall B",
    address: "Placeholder address, Sample City",
    fee: "Free (sample)",
    capacity: 200,
    deadline: "2027-02-01",
    summary: "An evening talk on how learning tools are changing classrooms, with time for audience questions.",
    description:
      "A guest speaker (sample) explores opportunities and risks of AI tools in schools, with examples from teachers and students.\n\nThe talk is followed by a moderated Q&A.",
    rules: [
      "Open to teachers, parents and students.",
      "Seating is first come, first served.",
      "A recording may be shared later with consent."
    ]
  },
  {
    id: "science-fair-2027",
    title: "Junior Science Fair 2027",
    category: "Competitions",
    featured: false,
    date: "2027-02-20",
    time: "08:30 – 16:00",
    venue: "Sample Exhibition Center",
    address: "Placeholder address, Sample City",
    fee: "LKR-free (sample)",
    capacity: 80,
    deadline: "2027-02-10",
    summary: "Student projects in biology, physics, chemistry and computing, judged by a panel of volunteers.",
    description:
      "Students present a project poster and a three-minute explanation to judges. Awards are given in each category.",
    rules: [
      "Individual or team entries of up to three students.",
      "Projects must be original and safe for public display.",
      "Posters must not exceed A1 size."
    ]
  },
  {
    id: "community-photo-walk",
    title: "Community Photo Walk",
    category: "Community",
    featured: false,
    date: "2027-03-06",
    time: "07:00 – 09:00",
    venue: "Meet at Sample Riverside Park",
    address: "Placeholder meeting point",
    fee: "Free (sample)",
    capacity: 30,
    deadline: "2027-03-01",
    summary: "A relaxed early-morning walk to photograph light, people and everyday street life.",
    description:
      "Walk with fellow photographers at a comfortable pace. Experienced members share tips on composition and night-free exposure.\n\nPhones and simple cameras are welcome.",
    rules: [
      "Participants should wear comfortable shoes.",
      "Respect people's privacy when photographing.",
      "Walk is cancelled in heavy rain."
    ]
  },
  {
    id: "autumn-mentoring-session",
    title: "Autumn Mentoring Session",
    category: "Workshops",
    featured: false,
    date: "2026-11-21",
    time: "15:00 – 17:00",
    venue: "Sample Library Room 2",
    address: "Placeholder address, Sample City",
    fee: "Free (sample)",
    capacity: 25,
    deadline: "2026-10-30",
    summary: "One-to-one mentoring on university applications and study planning. Registration has closed (sample).",
    description:
      "Mentors meet participants in short sessions to review goals and create a study plan.\n\nThis example shows how a closed registration appears on the site.",
    rules: [
      "Sessions are 20 minutes each.",
      "Bring any draft documents you would like to discuss."
    ]
  }
];

// Announcements. Newest first is recommended, but the site sorts them by date automatically.
const ANNOUNCEMENTS = [
  {
    id: "a1",
    date: "2026-10-28",
    tag: "Update",
    title: "Early-bird registration is now open for the Debate Championship",
    body: "Sample notice: teams registering before the deadline receive a reduced entry status and a welcome pack."
  },
  {
    id: "a2",
    date: "2026-10-20",
    tag: "New",
    title: "Digital ID design preview is now available",
    body: "Sample notice: a design preview shows how verified participant IDs may work in a future release. No verification runs in this prototype."
  },
  {
    id: "a3",
    date: "2026-10-12",
    tag: "Notice",
    title: "Autumn Mentoring Session registration has closed",
    body: "Sample notice: the registration deadline has passed. Please check the events page for upcoming sessions."
  },
  {
    id: "a4",
    date: "2026-09-30",
    tag: "Announcement",
    title: "Welcome to the EVENTORA prototype",
    body: "Sample notice: this site demonstrates event discovery, filtering and a demo registration flow. All content is fictional."
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
function deadlineStatus(ev) {
  const days = daysUntil(ev.deadline);
  if (days < 0) return { open: false, text: "Registration closed" };
  if (days === 0) return { open: true, text: "Closes today" };
  if (days <= 7) return { open: true, text: `Closes in ${days} day${days === 1 ? "" : "s"}` };
  return { open: true, text: `Closes ${formatDate(ev.deadline)}` };
}

function registerButton(ev, className) {
  const status = deadlineStatus(ev);
  if (!status.open) {
    return `<button class="${className}" type="button" disabled>Registration closed</button>`;
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
  const status = deadlineStatus(ev);
  const detailHref = `#event/${encodeURIComponent(ev.id)}`;
  return `
    <article class="card">
      <div class="card-media" data-cat="${escapeHtml(ev.category)}">
        <span>${escapeHtml(ev.category)}</span>
        <em class="sample-badge">Sample</em>
      </div>
      <div class="card-body">
        <p class="card-meta">${escapeHtml(formatDate(ev.date))} · ${escapeHtml(ev.venue)}</p>
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

  const status = deadlineStatus(ev);
  const paragraphs = ev.description
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .join("");
  const rules = ev.rules.map((r) => `<li>${escapeHtml(r)}</li>`).join("");

  box.innerHTML = `
    <a class="back-link text-link" href="#events">? Back to events</a>
    <article class="detail">
      <header class="detail-head">
        <span class="sample-badge sample-tag">Sample event</span>
        <p class="eyebrow">${escapeHtml(ev.category)}</p>
        <h1>${escapeHtml(ev.title)}</h1>
        <p>${escapeHtml(ev.summary)}</p>
      </header>

      <div class="detail-body">
        <ul class="facts">
          <li><span>Date</span><strong>${escapeHtml(formatDate(ev.date))}</strong></li>
          <li><span>Time</span><strong>${escapeHtml(ev.time)}</strong></li>
          <li><span>Venue</span><strong>${escapeHtml(ev.venue)}</strong></li>
          <li><span>Fee</span><strong>${escapeHtml(ev.fee)}</strong></li>
          <li><span>Capacity</span><strong>${ev.capacity} places</strong></li>
        </ul>

        <div class="deadline-box">
          <strong>Registration deadline:</strong> ${escapeHtml(formatDate(ev.deadline))}
          <span class="status ${status.open ? "open" : "closed"}">${escapeHtml(status.text)}</span>
        </div>

        <h2>About this event</h2>
        ${paragraphs}

        <h2>Rules &amp; eligibility</h2>
        <ol class="rules">${rules}</ol>

        <p class="note">Address: ${escapeHtml(ev.address)}</p>

        <div class="detail-actions">
          ${registerButton(ev, "btn btn-gold")}
          <a class="btn btn-ghost" href="#events">Browse more events</a>
        </div>
      </div>
    </article>`;
}

/* ----- Registration form ----- */
const FIELD_RULES = {
  name: (el) => (el.value.trim().length >= 2 ? "" : "Please enter your full name (at least 2 characters)."),
  email: (el) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim())
    ? ""
    : "Please enter a valid email address, such as name@example.com."),
  institution: (el) => (el.value.trim() ? "" : "Please enter your school, college or organization."),
  event: (el) => (el.value ? "" : "Please choose an event."),
  consent: (el) => (el.checked ? "" : "Please confirm that you understand this is a demo.")
};

function populateEventOptions() {
  const options = EVENTS.map((ev) => {
    const open = deadlineStatus(ev).open;
    const label = open ? ev.title : `${ev.title} (registration closed)`;
    return `<option value="${escapeHtml(ev.id)}" ${open ? "" : "disabled"}>${escapeHtml(label)}</option>`;
  });
  $("#fEvent").innerHTML = `<option value="">Choose an event…</option>${options.join("")}`;
}

function prepareRegister(eventId) {
  if (eventId && EVENTS.some((e) => e.id === eventId)) {
    $("#fEvent").value = eventId;
  }
  // Clear previous error messages when the page is opened.
  $$("#registerForm .error").forEach((el) => { el.hidden = true; el.textContent = ""; });
  $$("#registerForm [aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
}

function validateField(el) {
  const rule = FIELD_RULES[el.name];
  if (!rule) return true;
  const message = rule(el);
  const errorEl = document.getElementById("err-" + el.name);
  el.setAttribute("aria-invalid", message ? "true" : "false");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }
  return !message;
}

function makeReference() {
  return "DEMO-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function setupRegistrationForm() {
  const form = $("#registerForm");

  // Validate a field when the user leaves it.
  form.addEventListener("blur", (e) => {
    if (FIELD_RULES[e.target.name]) validateField(e.target);
  }, true);

  // Update the message while typing once a field is already marked invalid.
  form.addEventListener("input", (e) => {
    if (e.target.getAttribute("aria-invalid") === "true") validateField(e.target);
  });
  form.addEventListener("change", (e) => {
    if (e.target.getAttribute("aria-invalid") === "true") validateField(e.target);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const formError = $("#formError");

    let firstInvalid = null;
    Array.from(form.elements)
      .filter((el) => FIELD_RULES[el.name])
      .forEach((el) => {
        const ok = validateField(el);
        if (!ok && !firstInvalid) firstInvalid = el;
      });

    if (firstInvalid) {
      formError.textContent = "Please fix the highlighted fields to continue.";
      formError.hidden = false;
      firstInvalid.focus();
      return;
    }

    formError.hidden = true;

    const eventId = $("#fEvent").value;
    const ev = EVENTS.find((e2) => e2.id === eventId);

    // Demo only: stored in memory for this page view, not saved or sent anywhere.
    lastDemo = {
      name: $("#fName").value.trim(),
      eventTitle: ev ? ev.title : "Sample event",
      eventDate: ev ? formatDate(ev.date) : "",
      ref: makeReference()
    };

    form.reset();
    prepareRegister("");
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