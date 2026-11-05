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
    var ended = function (el, attr) { var t = Date.parse(el.getAttribute(attr)); return !isNaN(t) && t < now; };
    // "Next" blocks: hide talks that have ended. The home page shows only the first one left.
    var sections = document.querySelectorAll('[data-upcoming-section]');
    for (var k = 0; k < sections.length; k++) {
      var feats = sections[k].querySelectorAll('[data-ends]');
      var firstOnly = sections[k].hasAttribute('data-first-only'), live = 0;
      for (var f = 0; f < feats.length; f++) {
        var show = !ended(feats[f], 'data-ends') && !(firstOnly && live > 0);
        feats[f].hidden = !show;
        if (show) live++;
      }
      sections[k].hidden = live === 0;
    }
    // Past lists: a talk that has ended takes its place among past talks.
    var later = document.querySelectorAll('[data-past-after]');
    for (var j = 0; j < later.length; j++) later[j].hidden = !ended(later[j], 'data-past-after');
    // Lists with a limit (home "Recently"): show the first N items that are not still upcoming.
    var limited = document.querySelectorAll('[data-limit]');
    for (var m = 0; m < limited.length; m++) {
      var max = parseInt(limited[m].getAttribute('data-limit'), 10) || 6, shown = 0;
      var items = limited[m].children;
      for (var n = 0; n < items.length; n++) {
        var stillUpcoming = items[n].hasAttribute('data-past-after') && !ended(items[n], 'data-past-after');
        items[n].hidden = stillUpcoming || shown >= max;
        if (!items[n].hidden) shown++;
      }
    }
    // Year groups on /speakers: shown when at least one of their talks is.
    var groups = document.querySelectorAll('[data-year-group]');
    for (var g = 0; g < groups.length; g++) groups[g].hidden = !groups[g].querySelector('.talk:not([hidden])');
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
    // Widening the window (or turning a phone) past the menu breakpoint closes the menu. Keep keyboard
    // focus: move it to the same link in the desktop navigation, or to its first link.
    listen(mq('(min-width: 900px)'), function (e) {
      if (!e.matches || panel.hidden) return;
      var active = document.activeElement;
      var hadFocus = active && (active === button || panel.contains(active));
      close(false);
      if (!hadFocus) return;
      var nav = document.querySelectorAll('.site-nav a[href]'), target = nav[0];
      var href = active.getAttribute && active.getAttribute('href');
      for (var i = 0; i < nav.length; i++) if (href && nav[i].getAttribute('href') === href) target = nav[i];
      if (target) target.focus({ preventScroll: true });
    });
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

    // Cropping only ever takes the ceiling: the photo stays anchored to its bottom edge (ANCHOR_Y 1), and the
    // frame is never wider than the photo's aspect with the ceiling strip removed (set at build from photos.json).
    // Wider screens get the photo on the grid margins instead.
    var ANCHOR_Y = 1;
    var heroCS = getComputedStyle(hero);
    var ASPECT = parseFloat(heroCS.getPropertyValue('--hero-aspect')) || 4 / 3;
    var MAX_ASPECT = parseFloat(heroCS.getPropertyValue('--hero-max-aspect')) || 1.6;
    var dead = false;
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

    // Width of n columns of the 12-column grid, so the settled photo ends on a column edge.
    function columns(content, gap, n) { return n * (content - 11 * gap) / 12 + (n - 1) * gap; }

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
      var gridRow = document.querySelector('.row');  // the grid's own gutter (--gap), resolved by the browser
      var gap = (gridRow && parseFloat(getComputedStyle(gridRow).columnGap)) || Math.max(16, Math.min(28, vw * 0.02));

      frame.style.transform = '';
      inner.style.transform = '';
      var T = rect(frame, base);
      var Ti = rect(title, base);
      var lr = logo.getBoundingClientRect();
      var Lg = { x: lr.left, y: lr.top, w: lr.width, h: lr.height }; // fixed header: viewport coordinates equal stage coordinates while pinned

      // Final rectangle F for the photo. Measure the caption at its final width first.
      caption.style.width = Math.max(0, vw - gutter * 2) + 'px';
      var capH = caption.offsetHeight || 18;
      var bottomRoom = capH + gap * 1.4;
      var availH = vh - top - bottomRoom;
      var F;
      if (vw / availH >= ASPECT) {
        // Wide screens: fill the height. Edge to edge only if the crop stays in the ceiling; otherwise the
        // photo sits flush left on the grid margin and ends on a column edge, never on an arbitrary width.
        var h = availH, wMax = h * MAX_ASPECT;
        if (wMax >= vw) F = { x: 0, y: top, w: vw, h: h };
        else {
          var content = vw - gutter * 2, limit = Math.min(content, wMax), n = 12;
          while (n > 1 && columns(content, gap, n) > limit + 0.5) n--;
          F = { x: gutter, y: top, w: columns(content, gap, n), h: h };
        }
      } else {
        // Tall screens (phones): full width at the photo's own aspect, nothing cropped.
        var w2 = vw, h2 = w2 / ASPECT;
        var free = Math.max(0, vh - top - h2 - bottomRoom);
        F = { x: 0, y: top + free * 0.3, w: w2, h: h2 };
      }
      var coverW = Math.max(F.w, F.h * ASPECT);
      var coverH = coverW / ASPECT;

      // The frame keeps its CSS box (the thumbnail) for good and is only ever transformed, so the
      // layout never moves (no layout shift). The image inside is laid out at its largest size and
      // only scaled down, so it stays sharp.
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
      if (!L || dead) return;
      // Title: shrinks into the header logo, then cross-fades into the real small lockup.
      if (logoAlways) {
        var fadeOnly = seg(p, 0.06, 0.4);
        title.style.transform = 'translate3d(0,' + (-24 * fadeOnly) + 'px,0)';
        title.style.opacity = String(1 - fadeOnly);
      } else {
        var tq = ease(seg(p, 0, 0.34));   // arrive first...
        var s = Math.pow(L.Lg.w / L.Ti.w, tq);          // geometric: shrinking looks even
        var tx = (L.Lg.x - L.Ti.x) * tq;
        var ty = (L.Lg.y - L.Ti.y) * tq;
        title.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + s + ')';
        // ...then swap in one step once docked. A cross-fade would show both lockups at once, and they
        // differ slightly in letter-spacing and leading, so the logo would look doubled.
        var docked = p >= 0.34 ? 1 : 0;
        title.style.opacity = String(1 - docked);
        setLogo(docked);
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
      var sx = R.w / L.T.w, sy = R.h / L.T.h;
      frame.style.transform = 'translate3d(' + (R.x - L.T.x) + 'px,' + (R.y - L.T.y) + 'px,0) scale(' + sx + ',' + sy + ')';
      var si = Math.max(R.w / L.coverW, R.h / L.coverH);  // the image always covers R, never stretched
      var ix = (R.w - L.coverW * si) / 2;
      var iy = (R.h - L.coverH * si) * ANCHOR_Y;
      inner.style.transform = 'translate3d(' + (ix / sx) + 'px,' + (iy / sy) + 'px,0) scale(' + (si / sx) + ',' + (si / sy) + ')';
      if (monoMode) mono.style.opacity = String(1 - ease(seg(p, 0.15, 0.75)));

      caption.style.opacity = String(seg(p, 0.86, 0.98));
    }

    function tick() {
      raf = 0;
      if (dead) return;
      var d = target - current;
      current = Math.abs(d) < 0.0006 ? target : current + d * lerp;
      apply(current);
      if (current !== target) raf = window.requestAnimationFrame(tick);
    }
    function onScroll() {
      if (!L || dead) return;
      target = clamp((window.scrollY - L.heroTop) / L.pin);
      if (!raf) raf = window.requestAnimationFrame(tick);
    }

    var lastW = -1, lastH = -1, resizeTimer = 0;
    function relayout(force) {
      if (dead) return;
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

    function onLoad() { relayout(true); }

    function teardown() {
      if (dead) return;
      dead = true;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', onLoad);
      window.clearTimeout(resizeTimer);
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
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
    window.addEventListener('load', onLoad);
    listen(mq('(prefers-reduced-motion: reduce)'), function (e) { if (e.matches) teardown(); });
    return { relayout: relayout };
  })();

  updateRule();
  window.addEventListener('scroll', updateRule, { passive: true });
  if (!handoff) doc.classList.remove('js-handoff');
})();
