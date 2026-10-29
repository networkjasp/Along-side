/* ==========================================================================
   Alongside | Strategy & Comms — site behaviour
   - No inline event handlers (onclick=…) so a strict CSP can be enforced.
   - Works without GSAP: every animation degrades to a no-op and content is
     always made visible.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var hasGsap = typeof window.gsap !== 'undefined';
  var hasST = hasGsap && typeof window.ScrollTrigger !== 'undefined';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (hasST) { window.gsap.registerPlugin(window.ScrollTrigger); }

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ---------- Custom cursor (desktop, motion allowed, GSAP present) ---------- */
  var ce = $('#cur'), cr = $('#cur-r');
  if (ce && cr && hasGsap && finePointer && !reduceMotion) {
    root.classList.add('has-cursor');
    var mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;
    doc.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY; window.gsap.set(ce, { x: mx, y: my });
    }, { passive: true });
    (function tick() {
      rx += (mx - rx) * 0.13; ry += (my - ry) * 0.13;
      window.gsap.set(cr, { x: rx, y: ry });
      window.requestAnimationFrame(tick);
    })();
    doc.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest('a,button,label,.pgc,.svc-card,.founder-card,.prin-item,.process-step')) {
        doc.body.classList.add('ch');
      }
    });
    doc.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest('a,button,label,.pgc,.svc-card,.founder-card,.prin-item,.process-step')) {
        doc.body.classList.remove('ch');
      }
    });
  }

  /* ---------- Nav background + scroll progress (one rAF-throttled handler) ---------- */
  var nav = $('#nav'), prog = $('#prog'), ticking = false;
  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 80);
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
    if (open) {
      var first = $('.mm', mob);
      if (first) first.focus();
      if (hasGsap && !reduceMotion) {
        window.gsap.fromTo($$('.mm', mob), { y: 28, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.55, ease: 'power3.out' });
      }
    }
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

  /* ---------- Hero entrance ---------- */
  /* Splits the heading into words using DOM nodes (no innerHTML / inline
     styles). The accessible name is unchanged because the text is the same. */
  function splitWords(el) {
    var parts = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { parts.push(doc.createTextNode(' ')); return; }
          var m = doc.createElement('span'); m.className = 'wmask';
          var s = doc.createElement('span'); s.className = 'ww'; s.textContent = w;
          m.appendChild(s); parts.push(m);
        });
      } else if (node.nodeName === 'EM') {
        var m2 = doc.createElement('span'); m2.className = 'wmask';
        var s2 = doc.createElement('span'); s2.className = 'ww';
        s2.appendChild(node.cloneNode(true));
        m2.appendChild(s2); parts.push(m2);
      } else {
        parts.push(node.cloneNode(true));
      }
    });
    el.textContent = '';
    parts.forEach(function (p) { el.appendChild(p); });
  }

  var heroTitle = $('[data-hero-title]');
  if (hasGsap && !reduceMotion) {
    window.gsap.fromTo('#nav', { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out', delay: 0.15 });
    var rule = $('[data-hero-rule]');
    if (rule) window.gsap.fromTo(rule, { width: 0 }, { width: '2.8rem', duration: 0.65, ease: 'power3.out', delay: 0.3 });
    if (heroTitle) {
      splitWords(heroTitle);
      var tl = window.gsap.timeline({ delay: 0.4 });
      tl.fromTo($$('.ww', heroTitle), { y: '115%' }, { y: '0%', stagger: 0.05, duration: 0.85, ease: 'power3.out' });
      $$('[data-hero-fade]').forEach(function (el) {
        tl.fromTo(el, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out' }, '-=.5');
      });
    }
  }

  /* ---------- Scroll reveals ---------- */
  var reveals = $$('.ru');
  function showAll() { reveals.forEach(function (el) { el.classList.add('in'); }); }
  if (reduceMotion) {
    showAll();
  } else if (hasST) {
    reveals.forEach(function (el) {
      window.ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () { el.classList.add('in'); } });
    });
  } else if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    showAll();
  }
  /* Safety net: never leave content hidden. */
  window.setTimeout(function () {
    reveals.forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
    });
  }, 2500);

  /* ---------- Counters ---------- */
  /* Numbers are written in the HTML as their final value, so they never show
     "0" if JS or GSAP fails (the original started every counter at 0). */
  if (hasST && !reduceMotion) {
    $$('[data-count]').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      if (isNaN(target)) return;
      window.ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () {
          var o = { v: 0 };
          window.gsap.to(o, { v: target, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v) + suffix; } });
        }
      });
    });
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
      if (hasST) window.ScrollTrigger.refresh();
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
