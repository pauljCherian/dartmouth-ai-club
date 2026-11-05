/* Dartmouth AI Club - site.js
   1. Upcoming vs past talks (so a talk moves to "past" the moment it ends, even without a rebuild)
   2. Header hairline once content scrolls under it
   3. Mobile menu (logo + close, focus kept inside, Escape closes)
   4. The hand-off: scroll-scrubbed hero on the home page.
      The giant title shrinks into the header logo while the photo grows from the
      thumbnail to fill the frame. Only transform and opacity change, so the
      browser can run it on the compositor. Native scrolling is never touched.
*/
(function () {
  'use strict';

  var doc = document.documentElement;
  var clamp = function (v, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, v)); };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var mix = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: function () {} }; };
  var listen = function (m, fn) { if (m.addEventListener) m.addEventListener('change', fn); else if (m.addListener) m.addListener(fn); };

  /* ---------- 1. Upcoming vs past ---------- */
  (function talks() {
    var now = Date.now();
    var upcoming = document.querySelectorAll('[data-ends]');
    for (var i = 0; i < upcoming.length; i++) {
      var t = Date.parse(upcoming[i].getAttribute('data-ends'));
      if (!isNaN(t) && t < now) upcoming[i].hidden = true;
    }
    var later = document.querySelectorAll('[data-past-after]');
    for (var j = 0; j < later.length; j++) {
      var u = Date.parse(later[j].getAttribute('data-past-after'));
      if (!isNaN(u) && u < now) later[j].hidden = false;
    }
    var sections = document.querySelectorAll('[data-upcoming-section]');
    for (var k = 0; k < sections.length; k++) {
      if (!sections[k].querySelector('[data-ends]:not([hidden])')) sections[k].hidden = true;
    }
  })();

  /* ---------- 2. Header hairline ---------- */
  var header = document.querySelector('[data-header]');
  var ruleAfter = 4; // px of scroll before the hairline shows; the hand-off raises it on the home page
  function updateRule() {
    if (!header) return;
    var past = window.scrollY > ruleAfter;
    header.classList.toggle('is-ruled', past);
    header.classList.toggle('is-solid', past);
  }

  /* ---------- 3. Mobile menu ---------- */
  (function menu() {
    var button = document.querySelector('[data-menu-button]');
    var panel = document.getElementById('site-menu');
    if (!button || !panel) return;
    var label = button.querySelector('.menu-button__label');
    var outside = document.querySelectorAll('main, .site-footer, .skip-link');

    function setInert(on) {
      for (var i = 0; i < outside.length; i++) {
        if (on) outside[i].setAttribute('inert', ''); else outside[i].removeAttribute('inert');
      }
    }
    function focusables() {
      return [button].concat(Array.prototype.slice.call(panel.querySelectorAll('a[href], button:not([disabled])')));
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
      if (e.key !== 'Tab') return;
      var items = focusables();
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function open() {
      panel.hidden = false;
      doc.classList.add('menu-open');
      button.setAttribute('aria-expanded', 'true');
      if (label) label.textContent = 'Close menu';
      setInert(true);
      document.addEventListener('keydown', onKey);
      var firstLink = panel.querySelector('a[href]');
      if (firstLink) firstLink.focus({ preventScroll: true });
    }
    function close(returnFocus) {
      panel.hidden = true;
      doc.classList.remove('menu-open');
      button.setAttribute('aria-expanded', 'false');
      if (label) label.textContent = 'Menu';
      setInert(false);
      document.removeEventListener('keydown', onKey);
      if (returnFocus) button.focus({ preventScroll: true });
    }
    button.addEventListener('click', function () {
      if (button.getAttribute('aria-expanded') === 'true') close(true); else open();
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a[href]')) close(false);
    });
    listen(mq('(min-width: 900px)'), function (e) { if (e.matches && !panel.hidden) close(false); });
  })();

  /* ---------- 4. The hand-off ---------- */
  var handoff = (function () {
    var hero = document.querySelector('[data-handoff]');
    if (!hero || !doc.classList.contains('js-handoff')) return null;
    window.__daicHandoff = true;

    var stage = hero.querySelector('.hero__stage');
    var thumb = hero.querySelector('.hero__thumb');
    var title = hero.querySelector('.hero__title');
    var tagline = hero.querySelector('.hero__tagline');
    var frame = hero.querySelector('.hero__frame');
    var inner = hero.querySelector('.hero__img');
    var mono = hero.querySelector('.hero__photo--mono');
    var caption = hero.querySelector('.hero__caption');
    var logo = document.querySelector('.site-logo');
    if (!stage || !thumb || !title || !frame || !inner || !logo) return null;

    var ANCHOR_Y = 0.75;   // when the photo is cropped, 75% of the cut comes off the top (ceiling), 25% off the bottom
    var MAX_ASPECT = 1.8;  // never crop more than that: wider screens get thin side margins instead of losing heads
    var logoAlways = doc.classList.contains('logo-always');
    var monoMode = !!mono && (location.hash === '#mono' || hero.getAttribute('data-mono') === 'on');
    if (mono) mono.style.display = monoMode ? 'block' : 'none';

    // Measures the small viewport height (100svh) in pixels without depending on toolbars.
    var probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:calc(100 * var(--vh, 1vh));visibility:hidden;pointer-events:none;';
    document.body.appendChild(probe);

    var L = null;
    var target = 0, current = 0, raf = 0;
    var lerp = mq('(pointer: coarse)').matches ? 1 : 0.3;  // fingers drive it directly; wheel steps get smoothed

    function rect(el, base) {
      var r = el.getBoundingClientRect();
      return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
    }

    function measure() {
      title.style.transform = '';
      title.style.opacity = '';
      var base = stage.getBoundingClientRect();
      var vw = stage.clientWidth;
      var vh = probe.getBoundingClientRect().height || window.innerHeight;
      var headerBox = header ? header.getBoundingClientRect() : { height: 0 };
      var top = headerBox.height;
      var cs = getComputedStyle(title);
      var gutter = parseFloat(cs.left) || 16;
      var gap = Math.max(16, Math.min(28, vw * 0.02));

      var T = rect(thumb, base);
      var Ti = rect(title, base);
      var lr = logo.getBoundingClientRect();
      var Lg = { x: lr.left, y: lr.top, w: lr.width, h: lr.height }; // fixed header: viewport coordinates equal stage coordinates while pinned

      // Final rectangle F for the photo. Measure the caption at its final width first.
      caption.style.width = Math.max(0, vw - gutter * 2) + 'px';
      var capH = caption.offsetHeight || 18;
      var bottomRoom = capH + gap * 1.4;
      var availH = vh - top - bottomRoom;
      var F;
      if (vw / availH >= 4 / 3) {
        // Wide screens: fill the height. Go edge to edge only if the crop stays in the ceiling;
        // otherwise snap to the grid margins, so there are never thin accidental borders.
        var h = availH, wMax = h * MAX_ASPECT;
        if (wMax >= vw) F = { x: 0, y: top, w: vw, h: h };
        else { var w = Math.min(vw - gutter * 2, wMax); F = { x: (vw - w) / 2, y: top, w: w, h: h }; }
      } else {
        // Tall screens (phones): full width at the photo's own 4:3, nothing cropped.
        var w2 = vw, h2 = w2 * 0.75;
        var free = Math.max(0, vh - top - h2 - bottomRoom);
        F = { x: 0, y: top + free * 0.3, w: w2, h: h2 };
      }
      var coverW = Math.max(F.w, F.h * 4 / 3);
      var coverH = coverW * 0.75;

      frame.style.left = F.x + 'px';
      frame.style.top = F.y + 'px';
      frame.style.right = 'auto';
      frame.style.width = F.w + 'px';
      frame.style.height = F.h + 'px';
      frame.style.aspectRatio = 'auto';
      inner.style.width = coverW + 'px';
      inner.style.height = coverH + 'px';

      var capX = F.x > 0 ? F.x : gutter;
      caption.style.left = capX + 'px';
      caption.style.top = (F.y + F.h + gap * 0.6) + 'px';
      caption.style.width = Math.max(0, (F.x > 0 ? F.w : vw - gutter * 2)) + 'px';

      var heroTop = hero.getBoundingClientRect().top + window.scrollY;
      var pin = Math.max(1, hero.offsetHeight - stage.offsetHeight);
      L = { vw: vw, vh: vh, T: T, F: F, Ti: Ti, Lg: Lg, coverW: coverW, coverH: coverH, heroTop: heroTop, pin: pin };
      ruleAfter = heroTop + pin + 2;
    }

    function setLogo(o) {
      if (logoAlways) return;
      logo.style.opacity = String(o);
      logo.style.visibility = o > 0.01 ? 'visible' : 'hidden';
    }

    function apply(p) {
      if (!L) return;
      // Title: shrinks into the header logo, then cross-fades into the real small lockup.
      if (logoAlways) {
        var fadeOnly = seg(p, 0.06, 0.4);
        title.style.transform = 'translate3d(0,' + (-24 * fadeOnly) + 'px,0)';
        title.style.opacity = String(1 - fadeOnly);
      } else {
        var tq = ease(seg(p, 0, 0.36));
        var s = Math.pow(L.Lg.w / L.Ti.w, tq);          // geometric: shrinking looks even
        var tx = (L.Lg.x - L.Ti.x) * tq;
        var ty = (L.Lg.y - L.Ti.y) * tq;
        title.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + s + ')';
        var swap = seg(p, 0.3, 0.38);
        title.style.opacity = String(1 - swap);
        setLogo(swap);
      }

      // Tagline steps back first.
      var tg = seg(p, 0, 0.14);
      if (tagline) {
        tagline.style.opacity = String(1 - tg);
        tagline.style.transform = 'translate3d(0,' + (-12 * tg) + 'px,0)';
      }

      // Photo: from the thumbnail rectangle T to the final rectangle F.
      var e = ease(seg(p, 0.08, 0.86));
      var R = { x: mix(L.T.x, L.F.x, e), y: mix(L.T.y, L.F.y, e), w: mix(L.T.w, L.F.w, e), h: mix(L.T.h, L.F.h, e) };
      var sx = R.w / L.F.w, sy = R.h / L.F.h;
      frame.style.transform = 'translate3d(' + (R.x - L.F.x) + 'px,' + (R.y - L.F.y) + 'px,0) scale(' + sx + ',' + sy + ')';
      var si = Math.max(R.w / L.coverW, R.h / L.coverH);  // the image always covers R, never stretched
      var ix = (R.w - L.coverW * si) / 2;
      var iy = (R.h - L.coverH * si) * ANCHOR_Y;
      inner.style.transform = 'translate3d(' + (ix / sx) + 'px,' + (iy / sy) + 'px,0) scale(' + (si / sx) + ',' + (si / sy) + ')';
      if (monoMode) mono.style.opacity = String(1 - ease(seg(p, 0.15, 0.75)));

      caption.style.opacity = String(seg(p, 0.86, 0.98));
    }

    function tick() {
      raf = 0;
      var d = target - current;
      current = Math.abs(d) < 0.0006 ? target : current + d * lerp;
      apply(current);
      if (current !== target) raf = window.requestAnimationFrame(tick);
    }
    function onScroll() {
      if (!L) return;
      target = clamp((window.scrollY - L.heroTop) / L.pin);
      if (!raf) raf = window.requestAnimationFrame(tick);
    }

    var lastW = -1, lastH = -1, resizeTimer = 0;
    function relayout(force) {
      var w = stage.clientWidth, h = probe.getBoundingClientRect().height;
      if (!force && w === lastW && Math.abs(h - lastH) < 1) return;
      lastW = w; lastH = h;
      measure();
      current = target = clamp((window.scrollY - L.heroTop) / L.pin);
      apply(current);
      updateRule();
    }
    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { relayout(false); }, 120);
    }

    function teardown() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (raf) window.cancelAnimationFrame(raf);
      doc.classList.remove('js-handoff');
      [title, tagline, frame, inner, caption, logo, mono].forEach(function (el) {
        if (!el) return;
        el.style.transform = ''; el.style.opacity = ''; el.style.visibility = '';
        if (el === frame || el === inner || el === caption) el.removeAttribute('style');
      });
      if (mono) mono.style.display = 'none';
      ruleAfter = 4;
      updateRule();
    }

    relayout(true);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { relayout(true); });
    window.addEventListener('load', function () { relayout(true); });
    listen(mq('(prefers-reduced-motion: reduce)'), function (e) { if (e.matches) teardown(); });
    return { relayout: relayout };
  })();

  updateRule();
  window.addEventListener('scroll', updateRule, { passive: true });
  if (!handoff) doc.classList.remove('js-handoff');
})();
