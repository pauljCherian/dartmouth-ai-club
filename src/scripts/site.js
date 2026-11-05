/* Dartmouth AI Club - site.js
   1. Header hairline once content scrolls under it
   2. Mobile menu (logo + close, focus kept inside, Escape closes)
   3. The hand-off: scroll-scrubbed hero on the home page.
      The giant title shrinks into the header logo while the photo grows from the
      thumbnail to fill the frame. Only transform and opacity change, so the
      browser can run it on the compositor. Native scrolling is never touched.
*/
(function () {
  'use strict';

  var doc = document.documentElement;
  window.__daicSite = true;
  doc.classList.add('js');  // in case the early script's last-resort timer gave up on this file before it arrived
  var clamp = function (v, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, v)); };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var mix = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: function () {} }; };
  var listen = function (m, fn) { if (m.addEventListener) m.addEventListener('change', fn); else if (m.addListener) m.addListener(fn); };

  /* ---------- 1. Header hairline ---------- */
  var header = document.querySelector('[data-header]');
  var ruleAfter = 4; // px of scroll before the hairline shows; the hand-off raises it on the home page
  function updateRule() {
    if (!header) return;
    var past = window.scrollY > ruleAfter;
    header.classList.toggle('is-ruled', past);
    header.classList.toggle('is-solid', past);
  }

  /* ---------- 2. Mobile menu ---------- */
  (function menu() {
    var button = document.querySelector('[data-menu-button]');
    var panel = document.getElementById('site-menu');
    if (!button || !panel) return;
    var outside = document.querySelectorAll('main, .site-footer, .skip-link');

    function setInert(on) {
      for (var i = 0; i < outside.length; i++) {
        if (on) outside[i].setAttribute('inert', ''); else outside[i].removeAttribute('inert');
      }
    }
    function focusables() {
      var home = document.querySelector('.site-logo');
      return (home ? [home] : []).concat([button], Array.prototype.slice.call(panel.querySelectorAll('a[href], button:not([disabled])')));
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
      setInert(true);
      document.addEventListener('keydown', onKey);
      panel.scrollTop = 0;  // a short screen may have left it scrolled; the first link must not sit under the header
      var firstLink = panel.querySelector('a[href]');
      if (firstLink) firstLink.focus({ preventScroll: true });
    }
    function close(returnFocus) {
      panel.hidden = true;
      doc.classList.remove('menu-open');
      button.setAttribute('aria-expanded', 'false');
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
    // Crossing the menu breakpoint (resizing, turning a phone, zooming) hides either the menu button or the
    // desktop navigation. Keep keyboard focus on the matching control on the other side. The browser may move
    // focus to <body> before this runs, so remember the last focused element (cleared by pointer use).
    var lastFocus = null;
    document.addEventListener('focusin', function (e) { lastFocus = e.target; });
    document.addEventListener('pointerdown', function () { lastFocus = null; }, true);
    listen(mq('(min-width: 56.25em)'), function (e) {
      var active = document.activeElement && document.activeElement !== document.body ? document.activeElement : lastFocus;
      if (e.matches) {
        var hadFocus = active && (active === button || panel.contains(active));
        if (!panel.hidden) close(false);
        if (!hadFocus) return;
        // The matching control on a laptop: the same address; for Home that is the logo (outside .site-nav), used
        // only while it can take focus (on the home page it is hidden until the hand-off has docked it).
        var nav = document.querySelectorAll('.site-logo, .site-nav a[href]'), target = null;
        var href = active.getAttribute && active.getAttribute('href');
        for (var i = 0; i < nav.length; i++) {
          if (!href || nav[i].getAttribute('href') !== href) continue;
          if (getComputedStyle(nav[i]).visibility !== 'hidden') target = nav[i];
        }
        target = target || document.querySelector('.site-nav a[href]');
        if (target) target.focus({ preventScroll: true });
      } else if (active && active.closest && active.closest('.site-nav')) {
        button.focus({ preventScroll: true });
      }
    });
  })();

  /* ---------- 3. The hand-off ---------- */
  var handoff = (function () {
    var hero = document.querySelector('[data-handoff]');
    var startParked = doc.classList.contains('handoff-parked');  // loaded in a window too short for it
    doc.classList.remove('handoff-parked');
    if (!hero || !(doc.classList.contains('js-handoff') || startParked)) return null;
    if (mq('(prefers-reduced-motion: reduce)').matches) return null;  // turned on while this file was loading
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
    var dead = false;    // reduced motion: off for good
    var parked = startParked;  // too short, or the title would be too small: static layout until the window changes
    var MIN_H = 300;     // below this height (e.g. 400% zoom) there is no room for title, tagline and photo: static layout
    var CONTENT_MAX = 1920;  // the page's content width cap (.wrap in main), so the photo shares the grid
    // Title timings, tried in order: scale ends at s, the rise starts at t (both end by 0.34). Fine steps, so
    // each screen gets the earliest rise that still clears the photo (an abrupt late rise looks like a jump).
    var CURVES = [{ s: 0.34, t: 0 }, { s: 0.30, t: 0.02 }, { s: 0.27, t: 0.04 }, { s: 0.24, t: 0.06 }, { s: 0.22, t: 0.08 },
      { s: 0.19, t: 0.10 }, { s: 0.16, t: 0.12 }, { s: 0.12, t: 0.16 }];
    // Matches the CSS: beside "AI CLUB" from 56.25em (900px at the default text size) wide, unless the short-screen
    // layout (landscape, 619px tall or less, in px like the CSS) applies.
    var wideQ = mq('(min-width: 56.25em)'), shortQ = mq('(orientation: landscape) and (max-height: 619px)');
    var taglineBeside = { get matches() { return wideQ.matches && !shortQ.matches; } };
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

      // Tagline. Wide screens put it beside "AI CLUB"; if it is too tall to clear "DARTMOUTH" there (larger
      // text, text-spacing settings) it goes under the title like on phones. Under the title it gets room for
      // its real height, not a guess, so it never runs into the title.
      hero.style.removeProperty('--tag-h');
      hero.classList.remove('hero--tag-under');
      hero.classList.add('is-measured');  // normally done by the inline script after the tagline already
      var under = !taglineBeside.matches;
      if (tagline) {
        tagline.style.transform = '';
        if (!under) {
          var lines = Array.prototype.map.call(title.querySelectorAll('svg path'), function (el) { return el.getBoundingClientRect(); })
            .sort(function (a, b) { return a.top - b.top; });
          if (lines.length > 1 && tagline.getBoundingClientRect().top < lines[0].bottom + gap * 0.5) under = true;
          if (under) hero.classList.add('hero--tag-under');
        }
        if (under) {
          var ts = getComputedStyle(tagline);
          var tagNeed = tagline.getBoundingClientRect().height + (parseFloat(ts.marginTop) || 0) + (parseFloat(ts.marginBottom) || 0) + gap;
          hero.style.setProperty('--tag-h', Math.ceil(tagNeed) + 'px');
        }
      }

      frame.style.transform = '';
      inner.style.transform = '';
      var T = rect(frame, base);
      // Both ends of the hand-off start on a whole pixel. A box whose top falls between pixels is drawn snapped to
      // the pixel grid, and the shrinking title and the header logo snap differently, so the swap would show as a
      // drop of about one device pixel. Each is nudged by its own fraction: the title as placed in the pinned stage
      // (whose top is 0), the logo in the fixed header. Measured: the pixels that visibly change at the swap fall
      // from about 3,600 to 23 on a 3x phone, and to 0-2 on most laptops.
      var frac = function (v) { return v - Math.round(v); };
      title.style.bottom = '';
      logo.style.position = ''; logo.style.top = '';
      var ty0 = frac(rect(title, base).y);
      if (Math.abs(ty0) > 0.001) title.style.bottom = 'calc(var(--title-bottom) + ' + ty0 + 'px)';
      var ly0 = frac(logo.getBoundingClientRect().top);
      if (Math.abs(ly0) > 0.001) { logo.style.position = 'relative'; logo.style.top = -ly0 + 'px'; }
      var Ti = rect(title, base);
      var lr = logo.getBoundingClientRect();
      var Lg = { x: lr.left, y: lr.top, w: lr.width, h: lr.height }; // fixed header: viewport coordinates equal stage coordinates while pinned

      // Final rectangle F for the photo, and its caption. The grid's content width is capped like the
      // page sections (1920px), so the settled photo lines up with the columns below it.
      var content = Math.min(vw - gutter * 2, CONTENT_MAX);
      var capFont = parseFloat(getComputedStyle(caption).fontSize) || 13;
      var capHeight = function (width) { caption.style.width = Math.max(0, width) + 'px'; return caption.offsetHeight || capFont * 1.4; };
      // Wide screens fill the height. Edge to edge only if the crop stays in the ceiling; otherwise flush left on
      // the grid margin, ending on a column edge (short screens keep every pixel instead of rounding down).
      var wideRect = function (availH) {
        var wMax = availH * MAX_ASPECT;
        if (wMax >= vw && vw - gutter * 2 <= CONTENT_MAX) return { x: 0, y: top, w: vw, h: availH };
        var limit = Math.min(content, wMax), w = limit;
        if (!shortQ.matches) { var n = 12; while (n > 1 && columns(content, gap, n) > limit + 0.5) n--; w = Math.min(columns(content, gap, n), limit); }
        // Never narrower than the photo itself at this height: then the frame gets shorter, not cropped at the sides.
        return { x: gutter, y: top, w: w, h: Math.min(availH, w / ASPECT) };
      };
      var F, cap;
      var capUnder = capHeight(content);
      if (vw / (vh - top - capUnder - gap * 1.4) >= ASPECT) {
        // First choice: the photo fills the height and the caption sits in the columns it leaves free, on the
        // photo's bottom edge, so that band is part of the layout. Too narrow a band: caption under the photo.
        var Fb = wideRect(vh - top - gap);
        var band = content - Fb.w - gap;
        if (Fb.x > 0 && band >= capFont * 12) {
          F = Fb;
          var hB = capHeight(band);
          cap = { x: F.x + F.w + gap, y: F.y + F.h - hB, w: band };
        } else {
          // Caption under the photo, as wide as the photo: its height depends on that width, which depends on
          // the room left for the photo. Settle it in a few passes.
          var hU = capUnder;
          for (var pass = 0; pass < 3; pass++) {
            F = wideRect(vh - top - hU - gap * 1.4);
            var hNext = capHeight(F.x > 0 ? F.w : content);
            if (hNext <= hU + 0.5) break;
            hU = hNext;
          }
          var band2 = content - F.w - gap;
          if (F.x > 0 && band2 >= capFont * 12) {
            // The shorter photo freed columns: the caption goes beside it after all, so the photo gets back the
            // height it gave up for a caption underneath (same width, so the band stays free).
            F = { x: F.x, y: F.y, w: F.w, h: Math.min(vh - top - gap, F.w / ASPECT) };
            var hB2 = capHeight(band2);
            cap = { x: F.x + F.w + gap, y: F.y + F.h - hB2, w: band2 };
          } else {
            capHeight(F.x > 0 ? F.w : content);
            cap = { x: F.x > 0 ? F.x : gutter, y: F.y + F.h + gap * 0.6, w: F.x > 0 ? F.w : content };
          }
        }
      } else {
        // Tall screens (phones): full width at the photo's own aspect, nothing cropped; caption under it. Wider
        // than the content cap (portrait monitors): on the margins at the cap, like the rest of the page.
        var capped = vw - gutter * 2 > CONTENT_MAX;
        var w2 = capped ? content : vw, h2 = w2 / ASPECT;
        var free = Math.max(0, vh - top - h2 - capUnder - gap * 1.4);
        F = { x: capped ? gutter : 0, y: top + free * 0.3, w: w2, h: h2 };
        cap = { x: gutter, y: F.y + F.h + gap * 0.6, w: content };
      }
      var coverW = Math.max(F.w, F.h * ASPECT);
      var coverH = coverW / ASPECT;

      // Title path. Shrinking and rising at the same rate, a full-width title would pass under the photo
      // thumbnail (top right) on narrow screens. Use the first timing that keeps them apart: the same rate
      // where there is room (desktop), otherwise shrink first and rise after.
      var ratio = Lg.w / Ti.w;
      var titleAt = function (q, c) {
        var a = ease(seg(q, 0, c.s)), b = ease(seg(q, c.t, 0.34)), sc = Math.pow(ratio, a);
        return { x: Ti.x + (Lg.x - Ti.x) * b, y: Ti.y + (Lg.y - Ti.y) * b, w: Ti.w * sc, h: Ti.h * sc };
      };
      var frameAt = function (q) {
        var e = ease(seg(q, 0.08, 0.86));
        return { x: mix(T.x, F.x, e), y: mix(T.y, F.y, e), w: mix(T.w, F.w, e), h: mix(T.h, F.h, e) };
      };
      var clashes = function (c) {
        for (var q = 0; q <= 0.34; q += 0.001) {
          var a = titleAt(q, c), f = frameAt(q);
          if (a.x < f.x + f.w + 2 && f.x < a.x + a.w + 2 && a.y < f.y + f.h + 2 && f.y < a.y + a.h + 2) return true;
        }
        return false;
      };
      var curve = CURVES[CURVES.length - 1];
      for (var ci = 0; ci < CURVES.length; ci++) if (!clashes(CURVES[ci])) { curve = CURVES[ci]; break; }

      // The frame keeps its CSS box (the thumbnail) for good and is only ever transformed, so the
      // layout never moves (no layout shift). The image inside is laid out at its largest size and
      // only scaled down, so it stays sharp.
      inner.style.width = coverW + 'px';
      inner.style.height = coverH + 'px';

      caption.style.left = cap.x + 'px';
      caption.style.top = cap.y + 'px';
      caption.style.width = Math.max(0, cap.w) + 'px';

      // The next section's rule sits one row padding below the settled photo and caption, the spacing every
      // other section has above its rule. Wide screens: the photo fills the screen down to a small gap, so the
      // hero gets a bottom margin. Tall screens (phones): the photo leaves the bottom of the stage empty, so the
      // margin is negative and the next section comes up into that empty part (CSS paints it above the stage).
      var rowPad = gridRow ? parseFloat(getComputedStyle(gridRow).paddingTop) || 0 : 0;
      var settledBottom = Math.max(F.y + F.h, cap.y + caption.offsetHeight);
      hero.style.marginBottom = Math.round(rowPad - (vh - settledBottom)) + 'px';

      var heroTop = hero.getBoundingClientRect().top + window.scrollY;
      var pin = Math.max(1, hero.offsetHeight - stage.offsetHeight);
      L = { vw: vw, vh: vh, T: T, F: F, Ti: Ti, Lg: Lg, coverW: coverW, coverH: coverH, heroTop: heroTop, pin: pin, curve: curve };
      ruleAfter = heroTop + pin + 2;
    }

    function setLogo(o) {
      if (logoAlways) return;
      if (!o && document.activeElement === logo) o = 1;  // focused: keep it visible rather than drop focus
      logo.style.opacity = String(o);
      logo.style.visibility = o > 0.01 ? 'visible' : 'hidden';
    }

    function apply(p) {
      if (!L || dead || parked) return;
      // Title: shrinks onto the header logo (the same drawing), then swaps for it in one step.
      if (logoAlways) {
        var fadeOnly = seg(p, 0.06, 0.4);
        title.style.transform = 'translate3d(0,' + (-24 * fadeOnly) + 'px,0)';
        title.style.opacity = String(1 - fadeOnly);
      } else {
        // Arrive first (by p = 0.34). Scale is geometric, so the shrinking looks even.
        var a = ease(seg(p, 0, L.curve.s)), b = ease(seg(p, L.curve.t, 0.34));
        var s = Math.pow(L.Lg.w / L.Ti.w, a);
        var tx = (L.Lg.x - L.Ti.x) * b;
        var ty = (L.Lg.y - L.Ti.y) * b;
        title.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + s + ')';
        // ...then swap in one step once docked: the title and the header logo are the same drawing in the same
        // place. Near the end the title stops being a pre-drawn layer (will-change), so the browser draws it at its
        // real size, as crisp as the logo; otherwise it is a shrunken picture of the big title, a little soft, and
        // the swap would show as a sharpening on phones.
        title.style.willChange = p >= 0.3 ? 'auto' : '';
        var docked = p >= 0.34 ? 1 : 0;
        title.style.opacity = String(1 - docked);
        setLogo(docked);
      }

      // Tagline steps back first.
      var tg = seg(p, 0, 0.03);
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

      caption.style.opacity = p >= 0.86 ? '1' : '0';
    }

    function tick() {
      raf = 0;
      if (dead || parked) return;
      var d = target - current;
      current = Math.abs(d) < 0.0006 ? target : current + d * lerp;
      apply(current);
      if (current !== target) raf = window.requestAnimationFrame(tick);
    }
    function onScroll() {
      if (!L || dead || parked) return;
      target = clamp((window.scrollY - L.heroTop) / L.pin);
      if (!raf) raf = window.requestAnimationFrame(tick);
    }

    var lastW = -1, lastH = -1, resizeTimer = 0;
    function relayout(force) {
      if (dead) return;
      var w = stage.clientWidth, h = probe.getBoundingClientRect().height;
      var same = w === lastW && Math.abs(h - lastH) < 1;
      if (parked && same) return;  // parked at this size: try again only when the window changes
      if (!force && same) return;
      lastW = w; lastH = h;
      if (h && h < MIN_H) { park(); return; }
      if (parked) {
        parked = false;
        doc.classList.add('js-handoff');
        if (mono) mono.style.display = monoMode ? 'block' : 'none';
      }
      measure();
      // A title squeezed to a sliver (very short screens with large text) reads worse than the static layout.
      if (L.Ti.w < 0.4 * Math.min(w - 2 * (parseFloat(getComputedStyle(title).left) || 16), CONTENT_MAX)) { park(); return; }
      current = target = clamp((window.scrollY - L.heroTop) / L.pin);
      apply(current);
      updateRule();
    }
    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { relayout(false); }, 120);
    }

    function onLoad() { relayout(true); }
    // Text that changes size after load (fonts arriving, a text-spacing tool, a larger default size) re-measures.
    var sizeWatch = window.ResizeObserver && tagline ? new ResizeObserver(function () { window.requestAnimationFrame(function () { relayout(true); }); }) : null;

    // Back to the static layout: no inline styles left behind.
    function toStatic() {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      doc.classList.remove('js-handoff');
      [title, tagline, frame, inner, caption, logo, mono].forEach(function (el) {
        if (!el) return;
        el.style.transform = ''; el.style.opacity = ''; el.style.visibility = '';
        if (el === frame || el === inner || el === caption) el.removeAttribute('style');
      });
      if (mono) mono.style.display = 'none';
      title.style.bottom = '';
      logo.style.position = ''; logo.style.top = '';
      hero.style.removeProperty('--tag-h');
      hero.style.marginBottom = '';
      hero.classList.remove('hero--tag-under');
      ruleAfter = 4;
      updateRule();
    }
    // Size-based: static for now, listeners kept, so the hand-off returns when the window has room again.
    function park() {
      if (parked) return;
      parked = true;
      toStatic();
    }
    // Reduced motion: static for good.
    function teardown() {
      if (dead) return;
      dead = true;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', onLoad);
      if (sizeWatch) sizeWatch.disconnect();
      window.clearTimeout(resizeTimer);
      toStatic();
      if (probe.parentNode) probe.parentNode.removeChild(probe);
    }

    relayout(true);
    if (dead) return null;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { relayout(true); });
    window.addEventListener('load', onLoad);
    if (sizeWatch) sizeWatch.observe(tagline);
    listen(mq('(prefers-reduced-motion: reduce)'), function (e) { if (e.matches) teardown(); });
    return { relayout: relayout };
  })();

  updateRule();
  window.addEventListener('scroll', updateRule, { passive: true });
  if (!handoff) doc.classList.remove('js-handoff');
})();
