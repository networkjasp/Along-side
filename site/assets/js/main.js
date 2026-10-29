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
    var tiles = $$('[data-cat]');
    var empty = $('#port-empty');
    var live = $('#filter-status');
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      var cat = btn.getAttribute('data-filter');
      $$('button[data-filter]', filterBar).forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      var shown = 0;
      tiles.forEach(function (t) {
        var show = cat === 'all' || t.getAttribute('data-cat') === cat;
        t.hidden = !show;
        if (show) { shown++; t.classList.add('in'); }
      });
      if (empty) empty.hidden = shown !== 0;
      if (live) live.textContent = 'Showing ' + shown + ' project' + (shown === 1 ? '' : 's') + '.';
    });
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
