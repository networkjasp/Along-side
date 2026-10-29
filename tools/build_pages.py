#!/usr/bin/env python3
"""
Regenerates the shared header/nav/footer for every page in ../site.

The live site is plain static HTML (no build step is needed to deploy).
This script only exists so the navigation, footer and <head> stay identical
across pages. Edit the page bodies in tools/pages/*.html, then run:

    python3 tools/build_pages.py
"""
from pathlib import Path
import html, json

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
PAGES = Path(__file__).resolve().parent / "pages"

DOMAIN = "https://alongside.co.za"
BRAND = "Alongside | Strategy & Comms"
YEAR = "2026"
OG_IMAGE = DOMAIN + "/assets/img/og-image.png"  # official logo on a 1200x630 card

NAV = [("index.html", "Home"), ("about.html", "About"), ("services.html", "Services"), ("portfolio.html", "Portfolio")]

SERVICES_FOOTER = [
    ("marketing", "Marketing management"),
    ("strategic-communications", "Strategic communications"),
    ("campaigns-content-pr", "Campaigns, content &amp; PR"),
    ("branding-design", "Branding &amp; design"),
    ("digital-websites", "Digital &amp; websites"),
    ("events-webinars", "Events &amp; webinars"),
]

WA_SVG = ('<svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>')

# file, body-class, <title>, meta description, indexable
PAGE_META = [
    ("index.html", "p-home", f"{BRAND} — We work alongside your teams",
     "Strategic thinking. Practical delivery. Founder-led marketing, communications and creative support in Pretoria, South Africa — working alongside your team.", True),
    ("about.html", "p-about", f"About — {BRAND}",
     "Founder-led and directly managed, with a trusted network of independent specialists brought in when a brief needs more. Meet founder Stephné du Toit-Smit.", True),
    ("services.html", "p-services", f"Services — {BRAND}",
     "Six connected services: marketing management, strategic and change communications, campaigns and PR, branding and design, digital and websites, events and sales support.", True),
    ("portfolio.html", "p-portfolio", f"Portfolio — {BRAND}",
     "Selected marketing, communication and creative work, developed alongside clients and specialist collaborators.", True),
    ("contact.html", "p-contact", f"Contact — {BRAND}",
     "Need ongoing marketing support or help with a particular project? Contact Alongside in Pretoria, South Africa.", True),
    ("privacy.html", "p-simple", f"Privacy Notice — {BRAND}",
     "How Alongside collects and uses the personal information you share through this website.", True),
    ("thanks.html", "p-simple", f"Message sent — {BRAND}",
     "Thank you for contacting Alongside.", False),
    ("404.html", "p-simple", f"Page not found — {BRAND}",
     "The page you were looking for could not be found.", False),
]


def head(fname, title, desc, indexable):
    url = f"{DOMAIN}/" if fname == "index.html" else f"{DOMAIN}/{fname}"
    t, d = html.escape(title), html.escape(desc)
    robots = "" if indexable else '\n<meta name="robots" content="noindex"/>'
    canonical = f'\n<link rel="canonical" href="{url}"/>' if indexable else ""
    ld = ""
    if fname == "index.html":
        data = {
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            "name": "Alongside | Strategy & Comms",
            "url": DOMAIN + "/",
            "logo": DOMAIN + "/assets/img/logo.svg",
            "image": OG_IMAGE,
            "email": "stephne@alongside.co.za",
            "telephone": "+27845879933",
            "slogan": "Strategic thinking. Practical delivery.",
            "address": {"@type": "PostalAddress", "addressLocality": "Pretoria", "addressCountry": "ZA"},
            "founder": {"@type": "Person", "name": "Stephné du Toit-Smit"},
        }
        ld = '\n<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + "</script>"
    return f"""<!DOCTYPE html>
<html lang="en-ZA">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{t}</title>
<meta name="description" content="{d}"/>{robots}{canonical}
<meta name="theme-color" content="#FFFFFF"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="{html.escape(BRAND)}"/>
<meta property="og:title" content="{t}"/>
<meta property="og:description" content="{d}"/>
<meta property="og:url" content="{url}"/>
<meta property="og:image" content="{OG_IMAGE}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="Alongside — strategy &amp; comms, working with you"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml"/>
<link rel="icon" href="assets/img/favicon-32.png" type="image/png" sizes="32x32"/>
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png"/>
<link rel="preload" href="assets/fonts/poppins-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin/>
<link rel="preload" href="assets/fonts/poppins-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin/>
<link rel="stylesheet" href="assets/css/main.css"/>
<script src="assets/js/init.js"></script>
<script src="assets/js/main.js" defer></script>{ld}
</head>"""


def nav(fname):
    def cur(f):
        return ' aria-current="page"' if f == fname else ""
    links = "\n    ".join(f'<a href="{f}" class="n-link"{cur(f)}>{n}</a>' for f, n in NAV)
    mob = "\n  ".join(f'<a href="{f}" class="mm"{cur(f)}>{n}</a>' for f, n in NAV + [("contact.html", "Contact")])
    return f"""<a href="#main" class="skip">Skip to main content</a>
<div id="prog" aria-hidden="true"></div>

<header>
<nav id="nav" class="site-nav" aria-label="Main">
  <a href="index.html" class="n-logo"><picture><source media="(max-width: 900px)" srcset="assets/img/logo-wordmark.svg"/><img src="assets/img/logo.svg" alt="Alongside — strategy &amp; comms, working with you. Home" width="299" height="90"/></picture></a>
  <div class="n-links">
    {links}
    <a href="contact.html" class="n-cta"{cur("contact.html")}>Contact us</a>
    <button id="ham" class="ham" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mob"><span></span><span></span><span></span></button>
  </div>
</nav>
<div id="mob" class="mob">
  {mob}
</div>
</header>"""


def footer():
    navl = "".join(f'<li><a href="{f}">{n}</a></li>' for f, n in NAV + [("contact.html", "Contact")])
    svcs = "".join(f'<li><a href="services.html#{a}">{n}</a></li>' for a, n in SERVICES_FOOTER)
    return f"""<footer class="site-footer">
  <div class="ft-grid">
    <div><a href="index.html" class="ft-logo"><img src="assets/img/logo.svg" alt="Alongside — strategy &amp; comms, working with you" width="300" height="90" loading="lazy"/></a></div>
    <div class="ft-col"><h2>Navigate</h2><ul>{navl}</ul></div>
    <div class="ft-col"><h2>Services</h2><ul>{svcs}</ul></div>
    <div class="ft-col"><h2>Get in touch</h2><ul>
      <li><a href="mailto:stephne@alongside.co.za">stephne@alongside.co.za</a></li>
      <li><a href="tel:+27845879933">084&nbsp;587&nbsp;9933</a></li>
      <li><a href="https://wa.me/27845879933" target="_blank" rel="noopener noreferrer">WhatsApp us<span class="visually-hidden"> (opens in a new tab)</span></a></li>
      <li><span>Pretoria, South Africa</span></li>
    </ul></div>
  </div>
  <div class="ft-bot"><p>&#169; {YEAR} Alongside. All rights reserved. &middot; <a href="privacy.html">Privacy Notice</a></p><p>Strategic thinking. Practical delivery.</p></div>
</footer>

<a class="wa" href="https://wa.me/27845879933" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp (opens in a new tab)">
  {WA_SVG}
</a>"""


def build():
    for fname, cls, title, desc, idx in PAGE_META:
        body = (PAGES / fname).read_text(encoding="utf-8").strip()
        out = f"""{head(fname, title, desc, idx)}
<body class="{cls}">
{nav(fname)}

<main id="main" tabindex="-1">
{body}
</main>

{footer()}
</body>
</html>
"""
        if fname == "404.html":
            # The 404 page can be served at any depth (e.g. /a/b/c), so it
            # needs root-relative URLs for assets and links.
            out = out.replace('href="assets/', 'href="/assets/').replace('src="assets/', 'src="/assets/').replace('srcset="assets/', 'srcset="/assets/')
            for f, _ in NAV + [("contact.html", ""), ("privacy.html", "")]:
                out = out.replace(f'href="{f}', f'href="/{f}')
        (SITE / fname).write_text(out, encoding="utf-8")
        print("built", fname)


if __name__ == "__main__":
    build()
