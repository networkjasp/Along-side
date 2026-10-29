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
