# Website audit — findings and fixes

Audit of the files supplied in `Alongside_Website.zip` (October 2026), with the content
changes from *Alongside Website Copy* applied. Severity: **Critical**, **High**, **Medium**, **Low**.

> The previous `audit-report.html` claimed a 99.8% score and "10/10 security". Several of those
> claims were wrong (see S1–S4), and the report itself printed the admin password. It has been removed.

## 1. Security

| # | Sev. | Problem in the original | Fix |
|---|---|---|---|
| S1 | **Critical** | `portfolio-manager.html` was publicly deployed and linked from every portfolio page footer ("Manage portfolio"). Its "login" was a client-side check against a password hard-coded in the page source (`alongside2025`) **and printed on the login screen**. Anyone could read or bypass it. | Public link removed. The tool moved to `tools/` which is **never deployed** (Netlify publishes only `site/`). Fake password gate removed. Netlify returns 404 for `/portfolio-manager.html` even if an old copy lingers. |
| S2 | **Critical** | `audit-report.html` was deployed publicly and also published the password. | Removed from the site; 404 rule added in `netlify.toml`. **If `alongside2025` is used anywhere else (email, hosting, Wix), change it now.** |
| S3 | High | Portfolio manager had stored-XSS paths: link labels inserted without escaping; `escAttr()` output was placed inside `onclick="…"` where the browser decodes `&#39;` back to `'`, allowing script injection via a project title; `javascript:` / `data:` URLs accepted as links and images. | All values escaped (incl. `'`), inline handlers replaced by event delegation, only `https://` URLs accepted (`safeUrl()`). |
| S4 | High | No security headers (CSP, HSTS, framing, nosniff, referrer). Inline scripts and `onclick=` handlers everywhere made a Content-Security-Policy impossible. | All CSS/JS moved to files; no inline scripts, handlers or `style=""`. Strict CSP plus HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP in `netlify.toml`. Verified in a browser with zero CSP violations. |
| S5 | Medium | GSAP loaded from cdnjs and fonts from Google without Subresource Integrity — a CDN compromise could run code on the site; Google Fonts also sends visitor IPs to Google (POPIA consideration). | GSAP 3.12.5 and both font families are now self-hosted in `site/assets/`. |
| S6 | Medium | `target="_blank"` links used `rel="noopener"` only (report claimed `noopener noreferrer`). | All external links use `rel="noopener noreferrer"` and announce "opens in a new tab" to screen readers. |
| S7 | Medium | Client links used plain `http://` (Duvenhage Wines, 100% Health). | Changed to `https://` — **please click-test these two**; revert to http only if a site has no certificate. |
| S8 | Low | Contact form had no spam protection or length limits. | Netlify honeypot field + `maxlength` on every field. |
| S9 | Low | Hidden 1×1 images with `alt="Alongside"` and an HTML comment exposing the email address in the manager. | Removed. |

## 2. Functional bugs

| # | Sev. | Problem | Fix |
|---|---|---|---|
| F1 | **Critical** | **The contact form never sent anything.** `handleSubmit()` waited 0.9 s and showed "Thank you — your message has been sent" — every enquiry was silently lost. | Wired to Netlify Forms (AJAX + no-JS fallback to `thanks.html`). Shows success only on a real 200 response, otherwise an error with email/phone alternatives. Required fields validated with inline messages. |
| F2 | High | Home page file was named `index (16).html`. Every "Home" link points to `index.html`, so Home would 404 and the site root had no page. | Renamed to `index.html`; redirect added for the old name. |
| F3 | High | Colour tokens were inverted (`--ink` = light background, used as a text colour). Result: **the nav logo, hamburger icon, mobile-menu links and cursor dot were cream on cream — invisible.** On mobile there was no visible way to open the menu. | Tokens renamed (`--bg`, `--text`) and every affected element fixed. |
| F4 | High | `body{cursor:none}` hid the system cursor before JS drew the custom one — if GSAP failed to load, desktop users had no cursor at all. | System cursor is hidden only after the custom cursor initialises, never with reduced motion or touch. |
| F5 | High | All `.ru` sections started at `opacity:0`; if the CDN script failed, most of every page stayed blank. Stats counters likewise showed "0". | Content is hidden only when JS is running; IntersectionObserver fallback; 2.5 s safety net; counters render their real values in the HTML. |
| F6 | Medium | Mobile menu links stayed keyboard-focusable while invisible; focus wasn't moved into the menu; menu didn't close after choosing a link. | `inert` + `visibility:hidden` when closed, focus management, Esc/link/resize close, body scroll lock. |
| F7 | Medium | Portfolio filter only faded tiles to 15% opacity (still in tab order and read by screen readers); no pressed state. | Tiles are actually hidden, buttons use `aria-pressed`, result count announced. |
| F8 | Medium | Portfolio captions only appeared on mouse hover — invisible on phones/tablets and to keyboard users. | Captions always shown on touch devices and on keyboard focus; titles are real headings. |
| F9 | Medium | Wide portfolio tiles were twice as tall as their neighbours, leaving holes in the grid. | Wide tiles use a 32:9 ratio and the grid is balanced (3 full rows). |
| F10 | Medium | Testimonials auto-rotated every 5 s with no pause control; "tabs" were `div`s that couldn't be operated by keyboard. | Section removed per the copy brief (quotes were anonymous / not attributable). |
| F11 | Low | Portfolio manager "Categories" stat always showed 1 (`[new Set()].length`). | `new Set().size`. |
| F12 | Low | Phone links `tel:0845879933` (no country code — fails from foreign SIMs). | `tel:+27845879933`. |
| F13 | Low | Contact page: `aria-hidden` + `role="img"` + `aria-label` on the same icon; checkbox group without `fieldset/legend`; `alt` on an `<svg>`; duplicate `aria-label`/`aria-hidden` attributes on About and Services. | Fixed; all pages pass `html-validate` with zero errors. |
| F14 | Low | Founder name in the About portrait was CSS `content:` (not readable by assistive tech). | Real `<figcaption>`. |
| F15 | Low | 404 handling, `robots.txt`, `sitemap.xml`, canonical URLs and a privacy notice were missing (the form had no privacy link). | Added. |

## 3. Accessibility / readability

- Body text, labels and footer text were 2.4–3:1 contrast (WCAG AA needs 4.5:1). Raised to ≥4.5:1.
- Cream text on mint buttons was ~3:1. Buttons and small accent text now use a deeper brand green (`#15795A`, 5.4:1 with white). The original mint is kept for large display type, rules and decoration, so the look is unchanged.
- Visible keyboard focus outlines everywhere (inputs previously had `outline:none`).
- `prefers-reduced-motion` respected (marquee, reveals, word animation, cursor, counters).
- Headings structured correctly (service/principle/process titles were `div`s).

## 4. Content inconsistencies fixed by the copy update

- Experience stated three ways: "18+ years", "nearly two decades", and the brief's "more than 19 years" → now **19+ / more than 19 years** everywhere.
- "7+ years in associations" stat (unsupported) removed.
- Featured case "3× engagement / 12+ months / 100% on-brand" (unverified) replaced by workstream labels.
- "Wix-based websites" and "within one business day" promises removed.
- Copyright 2025 → 2026; brand standardised to "Alongside | Strategy & Comms".
- Footer services and form checkboxes now match the six new service names (the Portfolio footer previously listed only five).

## 5. Still to confirm before launch (from the copy brief)

1. **Founder name** — the brief uses "Stephné du Toit" (Home, Contact quick link) and "Stephné du Toit-Smit" (About). Implemented exactly as written at the client's request; confirm this is intended.
2. **IABC Africa Silver Quill** award line on About — confirm wording and permission.
3. **Client names / links** in the client strips and portfolio captions — confirm each is approved for public display.
4. **Privacy Notice** — a POPIA-aligned draft is included; have it reviewed (this is not legal advice).
5. **Images** are still hot-linked from `static.wixstatic.com`. If the old Wix site is ever closed they will disappear — download approved images into `site/assets/img/`.
6. Domain: canonical URLs use `https://alongside.co.za`. Change `DOMAIN` in `tools/build_pages.py` (and `robots.txt` / `sitemap.xml`) if the live domain differs.

## 6. Brand logo (added)

- The site previously used the word "Alongside" in a web font instead of the logo.
- The supplied logo (JPG) was converted to clean, transparent vector files in its exact colours
  (grey `#757575`, green "g" `#B7E0A8`, tagline green `#95B789`):
  - `site/assets/img/logo.svg`: full logo with "strategy & comms / working with you" (footer).
  - `site/assets/img/logo-wordmark.svg`: same artwork without the taglines, used in the
    navigation bar where the taglines would be too small to read.
  - `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`: the green "g" on a grey tile.
  - `og-image.png`: 1200×630 social-sharing card. Link previews on WhatsApp, LinkedIn and
    Facebook now show the logo instead of a portfolio photo hosted on Wix.
- If the designer has original vector files (AI/EPS/SVG), drop them in with the same file names
  for a perfect master copy.

## 7. Design refresh (from *Design Suggestions*)

Structure and section order are unchanged. Applied:

- **Logo:** full logo in the header at a size where "strategy & comms / working with you" stays
  readable (shrinks on scroll; wordmark on phones), full logo in the footer, deep-teal favicon.
- **Typography:** Poppins throughout: SemiBold headings, Medium navigation, Regular body at 16–17px.
  The serif and italic headings are gone; emphasis now uses deep teal plus a light-green highlight.
- **Colour:** white backgrounds alternating with `#F0F4F7`; charcoal `#3A4740` text; `#757575` for
  secondary text on white only (it fails contrast on the neutral, where `#5F6B64` is used);
  sage / light green / mint teal used only for graphics, number badges and panel borders.
- **Buttons:** one shape (8px radius, 48px high): deep teal with white text; outlined secondary.
- **Removed:** cream background, film-grain overlay, custom cursor circle, central hero divider line,
  "scroll to explore" line, decorative glows.
- **Home:** shorter opening with both columns aligned at the top; the next section shows on a laptop
  screen. Slower services strip with a Pause button. Services use number badges and thin dividers.
  Work thumbnails use consistent frames showing the full artwork, with captions beneath. Stats on the
  light neutral. Closing CTA is a compact deep-teal panel with a contrasting button.
- **About:** shorter opening, equal principle cards, founder panel (logo mark until a portrait is
  supplied), award as a small supporting panel.
- **Services:** rows standardised to number | title | description | button, with tighter spacing.
- **Portfolio:** uniform frames and caption positions; images now request the *uncropped* artwork
  from Wix (`/v1/fit/`) so wording and logos are not cut off.
- **Contact:** details beside the form with top edges aligned; bordered white fields with visible
  labels; matching line icons replace the mixed symbols.
- **Animation:** all text is visible immediately. Motion is a small lift only, and none with
  reduced-motion settings. The GSAP library is no longer needed and was removed (faster pages).

**Still needs material from you:**
- A professional portrait of Stephné for the About page.
- The approved client logos. The strip currently shows names.
- The CI line patterns. They weren't in the files I received, so the closing panel uses a faint
  logo "g" as a placeholder brand graphic. Send the pattern artwork (SVG preferred) and it can
  replace that.
- The mock-up pages in the PDF exported as blank pages, so the layout follows the written
  recommendations.

## 8. "Connected paths" headings (from reference image)

- Main headings are now heavy, tight-set Poppins SemiBold in charcoal, with no italics or highlight bar.
  Line breaks are balanced to match the reference ("Communication / that works in / the real world.").
- A three-line path graphic (mint teal, light green and sage, rounded corner) runs from behind the
  header across the top of every page opening. On Home ("Communication that works…") and About
  ("Founder-led…"), a second path runs in along the top and turns down between heading and text.
- The opening's right column now leads with "Strategic thinking. Practical delivery." as a teal
  sub-heading, followed by the copy and underlined links, as in the reference.
- The lines are pure CSS borders, with no images and no effect on load time, and are hidden from screen
  readers. On phones the connector is dropped and the opening lines are scaled down.

## 9. Website Manager (portfolio + founder photo)

- Added a sign-in portal at `/admin/` (Decap CMS 3.17.3, self-hosted, no CDN). Sign-in uses GitHub
  via Netlify's OAuth service, and only accounts with write access to the repo can save. This replaces the
  earlier fake client-side password and the local copy-paste tool (`tools/portfolio-manager.html`
  removed).
- Portfolio projects and the founder photo now live in `content/portfolio.json` and
  `content/founder.json`. Netlify runs `python3 tools/build_pages.py` on each deploy to render them.
  The build accepts only uploaded images (`/assets/uploads/…`) or `https://` URLs and escapes all text,
  so an entry can't inject code into the site.
- CSP moved from a response header to a per-page `<meta>` tag so the public pages stay strict while
  `/admin/` gets the wider policy Decap needs (`unsafe-eval`, GitHub API). `X-Frame-Options: DENY` and
  the other headers still come from `netlify.toml`.
- Tested end-to-end in a browser with Decap's local backend: uploading a project image and a founder
  photo wrote the image to `site/assets/uploads/`, updated the JSON, and the rebuilt pages showed both
  (test data removed afterwards). GitHub sign-in itself can only be tested once steps 1–4 in the
  README are done.

## 10. Website Manager rebuilt with a built-in email/password login

At the client's request, the GitHub-based manager (section 9) was replaced with one built into the
site that needs no GitHub account:

- **Login:** Netlify Identity (invite-only email + password, password-reset emails). The browser
  library is bundled into `site/admin/admin.js`, with no third-party scripts.
- **Authorisation:** every API call re-checks the login with Identity **and** requires the `admin`
  (or `editor`) role. Write requests must come from the site's own origin (CSRF protection).
- **Storage:** Netlify Blobs, so changes are live instantly with no rebuild.
- **Upload safety:** the browser resizes images (max 2000px) and strips metadata. The server only
  accepts real JPG/PNG/WebP (checked by file signature, max 5 MB). Images are served with
  `nosniff` and a sandbox CSP.
- **Content safety:** text length limits, enum categories, `https://` links only, images limited to
  uploaded files or the existing Wix URLs. Public pages render with `textContent`, never HTML.
- **Admin CSP:** as strict as the public site (`script-src 'self'`, no `unsafe-eval`).
- **Tests:** 9 API unit tests (`npm test`). A full browser run against a local stand-in for Netlify
  passed: sign-in, wrong password, add project with a 3200px image (stored at 2000px), https-only
  link check, reorder, Home-page pick, public pages updated, remove, founder photo set/remove,
  sign-out, the "no role" block, and the invite → choose password → manager flow.
- **Library workaround:** `@netlify/identity` 2.0.0's `acceptInvite()` does not set the session cookie,
  so the manager signs in once right after the password is chosen.
- Decap CMS, the GitHub OAuth setup and `site/admin/config.yml` were removed.

## 11. Website Manager: hidden © entrance and a single login

At the client's request the manager is reached by tapping the footer **©** five times, and uses one
username/password instead of Netlify Identity invites, with no Netlify setup steps. Unlike the
original manager (S1), the password is checked **on the server**:

- Only a salted scrypt hash is stored, in function code that browsers never receive. The real
  password appears nowhere in the repository (tests use their own test password). It can be
  changed with the `ADMIN_PASSWORD_HASH` environment variable.
- Sessions use an HMAC-signed, `HttpOnly; Secure; SameSite=Strict` cookie (8 hours). The signing secret
  is generated randomly and stored in Netlify Blobs.
- 5 failed sign-ins from one address lock it out for 15 minutes.
- Same-origin check on every write, including sign-in (CSRF).
- Netlify Identity and the browser bundle were removed. `admin.js` is a plain script with no build step.
- Tests: 12 API unit tests, plus a browser run: 4 taps did nothing and the 5th opened the manager,
  the wrong password (wrong case) was rejected, the right one signed in, the cookie was HttpOnly,
  Secure and SameSite=Strict, a project and founder photo uploaded and showed on the public pages,
  the session survived a reload, and after sign-out the API returned 401.

**Note:** the tap-the-© entrance is only a convenience. Security comes from the server-side
password check, because `/admin/` itself can be found by anyone.
