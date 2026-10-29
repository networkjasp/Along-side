/* ==========================================================================
   Alongside | Strategy & Comms — site behaviour
   - No inline event handlers, so a strict CSP can be enforced.
   - No animation library: essential text is visible immediately and motion is
     a light enhancement only (per the design review).
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ---------- Header state + scroll progress ---------- */
  var nav = $('#nav'), prog = $('#prog'), ticking = false;
  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    if (prog) {
      var dh = root.scrollHeight - window.innerHeight;
      prog.style.width = (dh > 0 ? (window.scrollY / dh) * 100 : 0) + '%';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var ham = $('#ham'), mob = $('#mob'), menuOpen = false;
  function setMenu(open) {
    if (!ham || !mob) return;
    menuOpen = open;
    ham.classList.toggle('open', open);
    ham.setAttribute('aria-expanded', open ? 'true' : 'false');
    ham.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mob.classList.toggle('open', open);
    if (open) { mob.removeAttribute('inert'); } else { mob.setAttribute('inert', ''); }
    doc.body.classList.toggle('menu-open', open);
    if (open) { var first = $('.mm', mob); if (first) first.focus(); }
  }
  if (ham && mob) {
    mob.setAttribute('inert', '');
    ham.addEventListener('click', function () { setMenu(!menuOpen); });
    $$('.mm', mob).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuOpen) { setMenu(false); ham.focus(); }
    });
    window.addEventListener('resize', function () { if (menuOpen && window.innerWidth > 900) setMenu(false); });
  }

  /* ---------- Services strip pause / play ---------- */
  var mq = $('#mqw'), mqBtn = $('#mq-toggle');
  if (mq && mqBtn) {
    mqBtn.addEventListener('click', function () {
      var paused = mq.classList.toggle('paused');
      mqBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      mqBtn.firstChild.textContent = paused ? 'Play' : 'Pause';
    });
  }

  /* ---------- Gentle lift on scroll (text is never hidden) ---------- */
  var reveals = $$('.ru');
  function showAll() { reveals.forEach(function (el) { el.classList.add('in'); }); }
  if (reduceMotion || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Portfolio filter ---------- */
  var filterBar = $('[data-filter-bar]');
  if (filterBar) {
    var empty = $('#port-empty');
    var live = $('#filter-status');
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      var cat = btn.getAttribute('data-filter');
      $$('button[data-filter]', filterBar).forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      var shown = 0;
      $$('#port-grid [data-cat]').forEach(function (t) {
        var show = cat === 'all' || t.getAttribute('data-cat') === cat;
        t.hidden = !show;
        if (show) { shown++; t.classList.add('in'); }
      });
      if (empty) empty.hidden = shown !== 0;
      if (live) live.textContent = 'Showing ' + shown + ' project' + (shown === 1 ? '' : 's') + '.';
    });
  }

  /* ---------- Website Manager: invite / password-reset links ---------- */
  /* Netlify Identity emails link to the site root; send them to the manager. */
  if (/(invite|recovery|confirmation|email_change)_token=/.test(location.hash) && !/\/admin\/?/.test(location.pathname)) {
    location.replace('/admin/' + location.hash);
    return;
  }

  /* ---------- Live portfolio + founder photo (from the Website Manager) ---------- */
  /* The HTML already contains a build-time copy, so pages work without this;
     it just swaps in the latest saved content. Text is set with textContent. */
  var CATS = { campaigns: 'Campaigns', branding: 'Branding', communications: 'Communications', digital: 'Digital' };
  var SAFE_IMG = /^(\/media\/[\w.-]+|\/assets\/[\w./-]+|https:\/\/static\.wixstatic\.com\/\S+)$/;
  function mk(tag, cls, text) { var n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function frame(item) {
    var f = mk('div', 'pgc-frame');
    var img = doc.createElement('img');
    img.src = item.image; img.alt = item.alt || item.title; img.loading = 'lazy'; img.decoding = 'async';
    img.width = 900; img.height = 675;
    f.appendChild(img);
    return f;
  }
  function renderPortfolio(items) {
    var grid = $('#port-grid');
    if (grid) {
      var active = $('[data-filter-bar] button[aria-pressed="true"]');
      var cat = active ? active.getAttribute('data-filter') : 'all';
      grid.textContent = '';
      items.forEach(function (it) {
        var li = mk('li', 'pgc ru in'); li.setAttribute('data-cat', it.category);
        li.hidden = !(cat === 'all' || cat === it.category);
        li.appendChild(frame(it));
        var cap = mk('div', 'pgc-cap');
        cap.appendChild(mk('p', 'pgc-tag', CATS[it.category] || ''));
        var h = mk('h3', 'pgc-title');
        if (it.link && /^https:\/\//.test(it.link)) {
          var a = mk('a', null, it.title); a.href = it.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
          a.appendChild(mk('span', 'visually-hidden', ' (opens in a new tab)'));
          h.appendChild(a);
        } else { h.textContent = it.title; }
        cap.appendChild(h);
        li.appendChild(cap);
        grid.appendChild(li);
      });
      if (!items.length) grid.appendChild(mk('li', 'port-empty', 'New work is on its way.'));
    }
    var home = $('.port-grid-home');
    if (home) {
      var picks = items.filter(function (i) { return i.show_on_home; }).slice(0, 4);
      if (!picks.length) picks = items.slice(0, 4);
      home.textContent = '';
      picks.forEach(function (it) {
        var fig = mk('figure', 'pgc ru in');
        fig.appendChild(frame(it));
        fig.appendChild(mk('figcaption', null, it.title));
        home.appendChild(fig);
      });
    }
  }
  function renderFounder(f) {
    var fig = $('.founder-portrait');
    if (!fig || !f) return;
    fig.textContent = '';
    var img = doc.createElement('img');
    if (f.photo && SAFE_IMG.test(f.photo)) {
      img.src = f.photo; img.alt = f.alt || f.name; img.width = 800; img.height = 1000;
    } else {
      img.src = 'assets/img/logo-mark.svg'; img.alt = ''; img.className = 'founder-portrait-mark'; img.width = 160; img.height = 160;
    }
    fig.appendChild(img);
    fig.appendChild(mk('figcaption', null, f.name || ''));
  }
  if (($('#port-grid') || $('.port-grid-home') || $('.founder-portrait')) && window.fetch && location.protocol !== 'file:') {
    fetch('/api/content', { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var items = (data.portfolio || []).filter(function (i) { return i && i.title && SAFE_IMG.test(i.image || '') && CATS[i.category]; });
        renderPortfolio(items);
        renderFounder(data.founder);
      })
      .catch(function () { /* keep the build-time content */ });
  }

  /* ---------- Contact form (Netlify Forms) ---------- */
  var form = $('#cform');
  if (form) {
    var btn = $('#fsub'), status = $('#form-status');
    var btnLabel = btn ? btn.innerHTML : '';
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function setError(input, msg) {
      var err = doc.getElementById(input.id + '-err');
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg || '';
    }
    function validate() {
      var ok = true, firstBad = null;
      var name = form.elements.name, email = form.elements.email, msg = form.elements.message;
      [name, email, msg].forEach(function (el) { setError(el, ''); });
      if (!name.value.trim()) { setError(name, 'Please enter your name.'); ok = false; firstBad = firstBad || name; }
      if (!emailRe.test(email.value.trim())) { setError(email, 'Please enter a valid email address.'); ok = false; firstBad = firstBad || email; }
      if (!msg.value.trim()) { setError(msg, 'Please tell us a little about what you are working on.'); ok = false; firstBad = firstBad || msg; }
      if (firstBad) firstBad.focus();
      return ok;
    }
    function showStatus(kind, text) {
      status.className = 'form-status ' + kind;
      status.textContent = text;
      status.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.hidden = true;
      if (!validate()) return;
      /* Honeypot: real people never fill this hidden field. */
      if (form.elements['bot-field'] && form.elements['bot-field'].value) return;

      btn.disabled = true;
      btn.textContent = 'Sending…';

      var body = new URLSearchParams(new FormData(form)).toString();
      /* Netlify Forms accepts AJAX posts to "/" (the form's `action` is only
         used as the success page when JavaScript is off). */
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        showStatus('ok', 'Thank you. Your message has been sent. We’ll be in touch.');
        status.focus();
      }).catch(function () {
        /* Never claim success when the message did not go through. */
        showStatus('err', 'Sorry, your message could not be sent. Please email stephne@alongside.co.za or call 084 587 9933.');
        status.focus();
      }).then(function () {
        btn.disabled = false;
        btn.innerHTML = btnLabel;
      });
    });
  }
})();
