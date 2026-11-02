# EVENTORA

EVENTORA is a static prototype for discovering, reading about and registering for events.
It is built with HTML, CSS and vanilla JavaScript only. It has no paid libraries, no external APIs,
and no backend.

> **Prototype notice:** All events, organizers, contact details and announcements are sample content.
> Registration is a demo. Submitted details are not sent to anyone, not stored, and not verified.
> The digital ID page is a design preview only and does not issue real identities.

---

## 1. Project files

```
eventora/
+-- index.html    ? page structure and all text sections
+-- style.css     ? colors, fonts, layout, responsive rules
+-- script.js     ? event data (top section) and app behavior
+-- README.md     ? this guide
```

Optional: add a file named `qr.png` in the same folder to show a real QR code on the QR page.

---

## 2. Test the website locally

**Option A (easiest):** Double-click `index.html`. It opens in your browser and everything works.

**Option B (recommended for testing as a website):**

1. Open a terminal in the `eventora` folder.
2. Run one of these commands:
   - Python 3: `python -m http.server 8000`
   - Python on Windows: `py -m http.server 8000`
   - Node.js: `npx http-server -p 8000` (if Node.js is installed)
3. Open `http://localhost:8000` in your browser.
4. Stop the server at any time with `Ctrl + C`.

**Checklist before publishing:**
- Test on a phone-sized screen (use your browser's responsive mode, usually `F12` ? device toolbar).
- Try the search box, category buttons and sort menu.
- Open an event, then click Register from its page.
- Submit the registration form empty to check the error messages.
- Complete the form correctly to see the demo confirmation page.

---

## 3. Publish on GitHub Pages (free)

1. **Create a GitHub account** at github.com if you do not have one.
2. **Create a repository:**
   - Click **+** ? **New repository**.
   - Name it `eventora` (the name becomes part of the web address).
   - Choose **Public**, then click **Create repository**.
3. **Upload your files:**
   - Click **uploading an existing file**.
   - Drag in `index.html`, `style.css`, `script.js`, `README.md` and `qr.png` (if you made one).
   - Click **Commit changes**.
4. **Turn on GitHub Pages:**
   - Open the **Settings** tab of your repository.
   - In the left menu, click **Pages**.
   - Under **Build and deployment**, set **Source** to **Deploy from a branch**.
   - Set **Branch** to `main` and folder to `/ (root)`, then click **Save**.
5. **Wait 1–3 minutes**, then refresh the Pages settings page. Your live address will appear, for example:
   `https://your-username.github.io/eventora/`
6. **Optional:** Open `script.js`, find `SITE_CONFIG`, and paste your live address into `publicUrl`. Then create a QR code for that address (see section 5).

Every time you upload or edit a file in GitHub, the live site updates automatically within a few minutes.

---

## 4. Update events (no coding experience needed)

Open `script.js` and find the section labelled **PART 1 · CONTENT**.

### Add a new event
1. Copy one complete block from `EVENTS`, starting with `{` and ending with `},`.
2. Paste it below the others, still inside the square brackets `[ ]`.
3. Change the values. Keep the quotation marks and commas:

| Field | What to write | Example |
|---|---|---|
| `id` | A unique short name, lowercase, with dashes, no spaces | `"robotics-day-2027"` |
| `title` | Event name | `"Robotics Day 2027"` |
| `category` | Must match one name in `CATEGORIES` | `"Competitions"` |
| `featured` | `true` to show on the home page, `false` otherwise | `true` |
| `date` | Year-month-day | `"2027-04-10"` |
| `time` | Start and end time | `"10:00 – 16:00"` |
| `venue` | Place name | `"Sample Hall A"` |
| `address` | Full address or note | `"Placeholder address"` |
| `fee` | Cost text | `"Free"` |
| `capacity` | Number of places | `60` |
| `deadline` | Last registration day, year-month-day | `"2027-04-01"` |
| `summary` | One short sentence shown on cards | `"A day of robots and ideas."` |
| `description` | Longer text. Use a blank line to start a new paragraph | see the file |
| `rules` | A list of rules, each in quotes and separated by commas | see the file |

### Change categories
Edit `CATEGORIES`, for example: `["Competitions", "Workshops", "Talks"]`.
Every event's `category` must match one of these names exactly.
If you add a new category, also add a matching colour rule in `style.css` (optional).

### Remove an event
Delete its whole block, including the `{` and `}` and the comma after it.

### Edit announcements
Edit the `ANNOUNCEMENTS` list in `script.js` using the same copy-and-edit method.
Fields are: `date`, `tag` (a short label such as "Update"), `title` and `body`.

### Edit text on the other pages
Open `index.html`. Each page is a section that starts with a comment such as `<!-- ============ ABOUT ============ -->`.
Change the text between the tags. Keep the tags such as `<p>` and `</p>` in place.

### Change colours
Open `style.css`. Edit the values in section **1 · Design tokens** at the top, for example `--gold: #c9a227;`.

---

## 5. Add a QR code

The QR page links to your public website. The code image is optional.

1. Publish the website (section 3) and copy its address.
2. Open any free QR code generator in your browser, paste the address and download the image.
3. Rename the image to `qr.png` and upload it next to `index.html` on GitHub.
4. Refresh the **QR & Share** page. The code appears automatically.

Test the code with your phone camera before sharing it.

---

## 6. Understanding the prototype limits

| Feature | Status in this version |
|---|---|
| Event browsing, search, filters and sorting | Working |
| Event detail pages, deadlines and rules | Working |
| Registration form validation | Working |
| Registration submission | **Demo only**. Nothing is sent or stored. |
| Confirmation screen | Shows a demo reference code. It is not an official receipt. |
| Payments | Not included. No payment is simulated or verified. |
| Participant verification and digital ID | Design preview only. No identity is verified or issued. |
| User accounts and login | Not included |

Future versions can connect a real backend, such as a hosted database and an email service, but any such
service must be designed with privacy, security and legal review first. Never place private keys or
passwords in these files, because anyone can view the code of a public GitHub Pages site.

---

## 7. Project structure notes

- **Content and design are separate:** `script.js` holds the event and announcement data, and `index.html` and `style.css` hold the layout and appearance.
- **One page, many views:** The site uses hash links such as `#events` and `#event/design-thinking-workshop`, so it works on GitHub Pages without extra server setup.
- **No external libraries:** Everything runs in the browser with no downloads or internet services required, except for loading the page itself.

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| Page looks unstyled | Check that `style.css` is in the same folder as `index.html` and the file name is spelled exactly. |
| Event changes do not appear | Hard-refresh the page (`Ctrl + F5` or `Cmd + Shift + R`) or wait a few minutes after publishing. |
| Clicking Register does nothing | Make sure `script.js` is in the same folder and linked at the bottom of `index.html`. |
| QR code does not appear | Confirm the file is named exactly `qr.png` and sits next to `index.html`. |
| GitHub Pages shows a 404 error | Check that `index.html` is in the root of the repository, not inside a subfolder, and that Pages is set to `main` / `/ (root)`. |
| A date shows one day off | Dates must use `YYYY-MM-DD`, for example `2027-01-16`. |