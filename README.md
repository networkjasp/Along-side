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
  assets/js/vendor/           GSAP 3.12.5, self-hosted
  assets/fonts/               Cormorant Garamond + Outfit, self-hosted (OFL)
tools/                ← never deployed
  pages/*.html                page content (edit these)
  build_pages.py              adds the shared head/nav/footer → writes site/*.html
  portfolio-manager.html      local helper for portfolio tiles (open in a browser)
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
   (publish directory `site`, no build command). If the site already exists, open
   **Site configuration → Build & deploy → Link repository**.
3. **Turn on form detection:** Netlify → *Forms* → **Enable form detection**, then redeploy once.
   Add a notification under *Forms → Form notifications → Email* so enquiries reach
   stephne@alongside.co.za.
4. Test: submit the contact form on the live site and confirm the email arrives.

## Editing content

- Small text edits: edit `tools/pages/<page>.html`, then run `python3 tools/build_pages.py`
  (Python 3, no packages needed). Editing `site/*.html` directly also works, but will be
  overwritten the next time the build script runs.
- Nav, footer, page titles and descriptions: edit `tools/build_pages.py`.
- Portfolio tiles: open `tools/portfolio-manager.html` in a browser, edit, copy the export code
  into the `<ul class="port-grid">` in `tools/pages/portfolio.html`, rebuild, commit, push.
- Run the checks locally: `npx html-validate "site/*.html"` (same check GitHub runs on every push).

## Security notes

- No inline scripts or styles: the Content-Security-Policy in `netlify.toml` depends on this.
  New scripts/styles go in `assets/`. If you add a third-party service (analytics, maps, a
  booking widget), its domain must be added to the CSP or it will be blocked.
- Never put passwords or keys in this repository — everything in `site/` is public.
- The old admin password `alongside2025` was published on the previous site; change it
  anywhere it was reused.

See `docs/AUDIT.md` for the full findings and the items still to confirm before launch.
