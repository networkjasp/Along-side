# Alongside | Strategy & Comms — website

Static website for Alongside (Pretoria, South Africa). Plain HTML/CSS/JS — no framework and no build step needed to deploy.

## Folder layout

```
site/                 ← the website (this is the ONLY folder Netlify publishes)
  index.html  about.html  services.html  portfolio.html  contact.html
  privacy.html  thanks.html  404.html  robots.txt  sitemap.xml
  assets/css/main.css         all styles
  assets/js/main.js           all behaviour (menu, animations, filter, contact form)
  assets/js/init.js           tiny head script (no-JS fallback flag)
  assets/fonts/               Poppins (CI typeface), self-hosted (OFL)
  assets/img/                 logo (SVG), favicons, social-sharing image
tools/                ← never deployed
  pages/*.html                page content (edit these)
  build_pages.py              builds site/*.html from pages + content (Netlify runs it)
content/              ← starting portfolio.json, founder.json (built into the pages)
site/admin/           ← Website Manager screen
netlify/              ← functions (API) + shared server code
tests/                ← API unit tests
docs/AUDIT.md         ← everything that was wrong and how it was fixed
netlify.toml          ← publish folder, security headers, redirects
```

## Deploy (GitHub → Netlify)

1. Create an empty repository on GitHub, then from this folder:
   ```bash
   git remote add origin https://github.com/<your-account>/alongside-website.git
   git push -u origin main
   ```
2. In Netlify: **Add new site → Import from Git → choose the repo**. Netlify reads `netlify.toml`
   (publish directory `site`, build command `python3 tools/build_pages.py`). If the site already exists, open
   **Site configuration → Build & deploy → Link repository**.
3. **Turn on form detection:** Netlify → *Forms* → **Enable form detection**, then redeploy once.
   Add a notification under *Forms → Form notifications → Email* so enquiries reach
   stephne@alongside.co.za.
4. Test: submit the contact form on the live site and confirm the email arrives.

## Design system (Alongside CI)

| Use | Colour |
|---|---|
| Main background | White `#FFFFFF` |
| Alternate sections, footer | Light neutral `#F0F4F7` |
| Headings and body text | Charcoal `#3A4740` |
| Secondary info (on white only) | Grey `#757575` |
| Buttons, links, closing panel | Deep teal `#0A3937` |
| Accents: panels, numbering, graphics (never small text) | Sage `#99BC8C`, light green `#B7DFA8`, mint teal `#9DD1D1` |

Typography: Poppins SemiBold (headings), Medium (navigation, labels), Regular (body, 16–17px).
All tokens are at the top of `site/assets/css/main.css`.

## Editing content

- Small text edits: edit `tools/pages/<page>.html`, then run `python3 tools/build_pages.py`
  (Python 3, no packages needed). Editing `site/*.html` directly also works, but will be
  overwritten the next time the build script runs.
- Nav, footer, page titles and descriptions: edit `tools/build_pages.py`.
- Portfolio projects and the founder photo: use the Website Manager (below).
- Run the checks locally: `npx html-validate "site/*.html"` (same check GitHub runs on every push).

## Website Manager (hidden portal)

**To open it:** tap the **©** in the footer of any page **5 times** (quickly), then sign in with
the username and password you were given. You can also go straight to `/admin/`.

In the manager:

- **Portfolio:** add a project (title, category, image, description, optional link), edit,
  reorder (↑ ↓), hide as a draft, tick up to four for the Home page, or remove.
- **Founder photo:** upload, replace or remove the photo on the About page.

Changes are live straight away. There's nothing to set up in Netlify: it works as soon as the site is deployed.

**How it stays secure**

- The password is **checked on the server**, never in the page. Only a scrambled (salted scrypt)
  version is kept, in server code (`netlify/lib/auth.mjs`) that visitors can't see.
- After signing in, the browser gets a signed, `HttpOnly` cookie that expires after 8 hours.
- 5 wrong passwords from one address lock it out for 15 minutes.
- Every save re-checks the session and only accepts requests from the site itself.
- Uploads must be real JPG/PNG/WebP images (max 5 MB, resized to 2000px in the browser, which removes GPS data).
- Keep this GitHub repository **private**.

**Changing the username or password** (no code change needed)

1. On your computer, in this folder: `npm run hash-password -- "your new password"`, then copy the output.
2. Netlify → Project configuration → Environment variables → add `ADMIN_PASSWORD_HASH` = (paste),
   and optionally `ADMIN_USERNAME`.
3. Redeploy. The new details work immediately, and the old password stops working.

**Under the hood:** `site/admin/` (manager screen), `netlify/functions/` (API),
Netlify Blobs (stores the portfolio list and uploaded images), `/api/content` and `/media/…`
(read-only, used by the public pages). The pages also contain a built-in copy of the portfolio
from `content/*.json`, so they still show work if the API is unreachable.

```bash
npm install && npm test     # 12 API tests: login, lockout, sessions, CSRF, uploads, validation
```

## Security notes

- No inline scripts or styles: the Content-Security-Policy (a `<meta>` tag added by `build_pages.py`) depends on this.
  New scripts/styles go in `assets/`. If you add a third-party service (analytics, maps, a
  booking widget), its domain must be added to the CSP or it will be blocked.
- Never put passwords or keys in this repository — everything in `site/` is public.
- The old admin password `alongside2025` was published on the previous site; change it
  anywhere it was reused.

See `docs/AUDIT.md` for the full findings and the items still to confirm before launch.
- Website Manager security: server-side password check (hashed), signed HttpOnly session cookie,
  login lockout, same-origin check on every write (CSRF), all text escaped, `https://` links only,
  uploads checked by file signature, and a strict CSP on `/admin` (no third-party scripts).
