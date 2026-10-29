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

## Website Manager (`/admin`)

A sign-in page built into the site at **https://alongside.co.za/admin/** for:

- **Portfolio:** add projects (title, category, image, description, optional link), edit,
  reorder (↑ ↓), hide as a draft, choose up to four for the Home page, or remove.
- **Founder photo:** upload, replace or remove the photo on the About page.

Changes are **live immediately** with no rebuild and no GitHub account needed. Sign-in is email + password.

**How it works**

| Piece | What it does |
|---|---|
| `site/admin/` | The manager screen (`admin.js` is built from `tools/admin/admin.src.js`) |
| Netlify Identity | Email/password accounts, invite-only, with password-reset emails |
| `netlify/functions/admin.mjs` | Checks the login **and** the `admin` role, then saves |
| Netlify Blobs | Stores the portfolio list (`site-content`) and uploaded images (`site-media`) |
| `/api/content`, `/media/…` | Public read-only endpoints the pages use to show the latest content |

The pages still contain a copy of the portfolio from `content/*.json` (built in), so they work
even if the API is unreachable. Uploaded photos are resized in the browser to a maximum of 2000px,
which also strips GPS/location data, and checked on the server (real JPG/PNG/WebP only, 5 MB max).
Images no longer used are cleaned up automatically after 6 hours.

### One-time setup (about 5 minutes, in Netlify)

1. **Turn on Identity:** Project configuration → Identity → **Enable Identity**.
2. **Make it invite-only:** Identity → Registration → **Invite only**. Important: this stops strangers creating accounts.
3. **Invite editors:** Identity → **Invite users** → enter `stephne@alongside.co.za`. She gets an
   email, clicks the link, and chooses a password (at least 10 characters).
4. **Give the role:** Identity → click the user → **Edit settings** → Roles: type `admin` → Save.
   Without this role an account can sign in but cannot change anything.
5. Optional: Identity → Emails, to customise the invite / reset email text.

To remove someone's access: Identity → user → **Delete user** (or remove the `admin` role).

### Day-to-day use

Go to `/admin/` → sign in → **Portfolio** or **Founder photo** → make the change → **Save**.
"Forgot your password?" on the sign-in screen sends a reset link.

### Developer notes

```bash
npm install
npm test           # API unit tests (auth, roles, origin check, upload checks, validation)
npm run build      # pages + admin bundle (Netlify runs this)
netlify dev        # full local run with Functions + Blobs (Netlify CLI; Identity needs a linked site)
```

## Security notes

- No inline scripts or styles: the Content-Security-Policy (a `<meta>` tag added by `build_pages.py`) depends on this.
  New scripts/styles go in `assets/`. If you add a third-party service (analytics, maps, a
  booking widget), its domain must be added to the CSP or it will be blocked.
- Never put passwords or keys in this repository — everything in `site/` is public.
- The old admin password `alongside2025` was published on the previous site; change it
  anywhere it was reused.

See `docs/AUDIT.md` for the full findings and the items still to confirm before launch.
- Website Manager security: invite-only accounts, `admin` role checked on every save, same-origin
  check on every write (CSRF), all text escaped, links must be `https://`, uploads checked by file
  signature, and a strict CSP on `/admin` (no `unsafe-eval`, no third-party scripts).
