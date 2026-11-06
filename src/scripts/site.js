/* Dartmouth AI Club - site.js
   1. Header hairline once content scrolls under it
   2. Mobile menu (logo + close, focus kept inside, Escape closes)
   3. The hand-off: scroll-scrubbed hero on the home page.
      The giant title shrinks into the header logo while the photo grows from the
      thumbnail to fill the frame. Only transform and opacity change. Native
      scrolling is never touched. On phones and tablets whose browser has
      scroll-driven animations (Chrome 115+, Safari 26+, Firefox 159+), this script
      only measures: it hands the browser the whole path as keyframes tied to the
      scroll position, and the browser plays them in step with the finger, off the
      main thread where it can (Chrome; Safari from 26.4). On laptops, and in older
      browsers, the script moves each frame itself, smoothing mouse-wheel steps.
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
  var menuPanel = document.getElementById('site-menu');
  var ruleAfter = 4; // px of scroll before the hairline shows; the hand-off raises it on the home page
  var withRule = null; // the hand-off's header-logo check, run with every header update (scroll, menu open and close)
  function updateRule() {
    if (!header) return;
    var past = window.scrollY > ruleAfter;
    // With the phone menu open, the menu covers the page: what can pass under the bar is the menu's own links
    // (on a short screen), so the hairline follows the menu's scroll, not the page's.
    var menuPast = menuPanel && doc.classList.contains('menu-open') ? menuPanel.scrollTop > 4 : null;
    header.classList.toggle('is-ruled', menuPast === null ? past : menuPast);
    header.classList.toggle('is-solid', past || !!menuPast);
    if (withRule) withRule();
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
    // Opened from the keyboard, focus goes to the first link and shows its ring, so keyboard users land in the menu.
    // Opened by a tap or a click, focus goes to the menu itself, which draws no ring: the page behind stays out of
    // reach and a screen reader starts in the menu, but no box appears around Home (iPhones draw the focus ring
    // for focus a script moves after a tap, and a box around Home reads as if Home were the current page).
    function open(viaKeyboard) {
      panel.hidden = false;
      doc.classList.add('menu-open');
      button.setAttribute('aria-expanded', 'true');
      setInert(true);
      document.addEventListener('keydown', onKey);
      panel.scrollTop = 0;  // a short screen may have left it scrolled; the first link must not sit under the header
      updateRule();
      var firstLink = panel.querySelector('a[href]');
      if (viaKeyboard && firstLink) firstLink.focus({ preventScroll: true });
      else panel.focus({ preventScroll: true });
    }
    function close(returnFocus) {
      panel.hidden = true;
      doc.classList.remove('menu-open');
      updateRule();
      button.setAttribute('aria-expanded', 'false');
      setInert(false);
      document.removeEventListener('keydown', onKey);
      if (returnFocus) button.focus({ preventScroll: true });
    }
    // A click from the keyboard (Enter or Space on the button) has detail 0; a tap or a mouse click has 1 or more.
    // Closing by tap leaves focus where the tap was; from the keyboard, focus returns to the button.
    button.addEventListener('click', function (e) {
      var viaKeyboard = e.detail === 0;
      if (button.getAttribute('aria-expanded') === 'true') close(viaKeyboard); else open(viaKeyboard);
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a[href]')) close(false);
    });
    panel.addEventListener('scroll', updateRule, { passive: true });
    // Crossing the menu breakpoint (resizing, turning a phone, zooming) hides either the menu button or the
    // desktop navigation. Keep keyboard focus on the matching control on the other side. The browser may move
    // focus to <body> before this runs, so remember the last focused element (cleared by pointer use).
    var lastFocus = null;
    document.addEventListener('focusin', function (e) { lastFocus = e.target; });
    document.addEventListener('pointerdown', function () { lastFocus = null; }, true);
    listen(mq('(min-width: 56.25em)'), function (e) {
      var active = document.activeElement && document.activeElement !== document.body ? document.activeElement : lastFocus;
      if (e.matches) {
        var hadFocus = active && active !== panel && (active === button || panel.contains(active));  // the menu itself: focus after a tap, nothing to carry over
        if (!panel.hidden) close(false);
        if (!hadFocus) return;
        // The matching control on a laptop: the same address; for Home that is the logo (outside .site-nav), used
        // only while it can take focus (on the home page it is hidden until the hand-off has docked it).
        var nav = document.querySelectorAll('.site-logo, .site-nav a[href]'), target = null;
        var href = active.getAttribute && active.getAttribute('href');
        for (var i = 0; i < nav.length; i++) {
          if (!href || nav[i].getAttribute('href') !== href) continue;
          if (getComputedStyle(nav[i]).visibility !== 'hidden' && !nav[i].hasAttribute('inert')) target = nav[i];
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
    var DOCK = 0.34;  // the title reaches the header logo here and swaps for it
    // In the scroll-driven path the moving title is a bitmap the browser shrinks, a little rougher than the header
    // logo, which is drawn at its size. So on screens with whole device pixels (iPhones, Macs, 1x monitors) the swap
    // is not one step: once docked, the logo fades in over the title (same drawing, same place, the logo on top),
    // then the title fades out under it, each over 2.5% of the stretch (about 20px of scroll on a phone). Measured:
    // no single scroll pixel then changes any pixel of the logo visibly. With a fractional pixel ratio (many Android
    // phones, Windows at 125%) the browser rounds the pinned stage to the pixel grid differently at each scroll
    // position, so a docked title would wobble under the still logo; there the swap stays one step, at docking.
    var fadeFor = function () { var r = window.devicePixelRatio || 1; return Math.abs(r - Math.round(r)) > 0.01 ? 0 : 0.025; };

    // Scroll-driven animations: the browser plays the hand-off from keyframes tied to the scroll position, in the
    // same frame as the scroll itself, so it never trails the finger. On a phone the page scrolls off the main
    // thread; a script that moves things on each scroll event is always a frame or more behind, and on iPhones it
    // stutters. Only where touch is the main input (phones, tablets): on a laptop the script path stays, because it
    // turns each notch of a mouse wheel into a glide (lerp above), where an animation tied to the scroll position
    // would jump a notch at a time. Tests can force the script path with window.__daicNoScrollTimeline.
    var SDA = (function () {
      if (window.__daicNoScrollTimeline || !mq('(pointer: coarse)').matches) return null;
      try {
        if (!(window.CSS && CSS.supports('animation-timeline: scroll()') && CSS.supports('animation-range: 0px 1px'))) return null;
        var sheet = new CSSStyleSheet();
        document.adoptedStyleSheets = Array.prototype.slice.call(document.adoptedStyleSheets || []).concat([sheet]);
        return { sheet: sheet, gen: 0, on: false, els: [], sig: '', set: null };
      } catch (e) { return null; }
    })();

    function rect(el, base) {
      var r = el.getBoundingClientRect();
      return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
    }

    // Width of n columns of the 12-column grid, so the settled photo ends on a column edge.
    function columns(content, gap, n) { return n * (content - 11 * gap) / 12 + (n - 1) * gap; }

    function measure() {
      stopSDA();  // everything is measured where the CSS puts it, before any animation moves it
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

    // Where everything is at progress p (0 to 1 over the pinned stretch), as numbers. The script path writes this to
    // the page each frame; the scroll-driven path samples it into keyframes once per layout. One path, two players.
    function state(p) {
      var o = {};
      // Title: shrinks onto the header logo (the same drawing), then swaps for it in one step.
      if (logoAlways) {
        var fadeOnly = seg(p, 0.06, 0.4);
        o.title = { x: 0, y: -24 * fadeOnly, s: 1 };
        o.titleOpacity = 1 - fadeOnly;
      } else {
        // Arrive first (by p = 0.34). Scale is geometric, so the shrinking looks even.
        var a = ease(seg(p, 0, L.curve.s)), b = ease(seg(p, L.curve.t, DOCK));
        o.title = { x: (L.Lg.x - L.Ti.x) * b, y: (L.Lg.y - L.Ti.y) * b, s: Math.pow(L.Lg.w / L.Ti.w, a) };
        // ...then swap in one step once docked: the title and the header logo are the same drawing in the same place.
        o.docked = p >= DOCK ? 1 : 0;
        o.titleOpacity = 1 - o.docked;
      }
      // Tagline steps back first.
      var tg = seg(p, 0, 0.03);
      o.tagOpacity = 1 - tg;
      o.tagY = -12 * tg;
      // Photo: from the thumbnail rectangle T to the final rectangle F.
      var e = ease(seg(p, 0.08, 0.86));
      var R = { x: mix(L.T.x, L.F.x, e), y: mix(L.T.y, L.F.y, e), w: mix(L.T.w, L.F.w, e), h: mix(L.T.h, L.F.h, e) };
      var sx = R.w / L.T.w, sy = R.h / L.T.h;
      o.frame = { x: R.x - L.T.x, y: R.y - L.T.y, sx: sx, sy: sy };
      var si = Math.max(R.w / L.coverW, R.h / L.coverH);  // the image always covers R, never stretched
      var ix = (R.w - L.coverW * si) / 2;
      var iy = (R.h - L.coverH * si) * ANCHOR_Y;
      o.inner = { x: ix / sx, y: iy / sy, sx: si / sx, sy: si / sy };
      o.mono = 1 - ease(seg(p, 0.15, 0.75));
      o.caption = p >= 0.86 ? 1 : 0;
      return o;
    }

    // The script path. In the scroll-driven path the same values go in once, as plain styles under the animations:
    // a new animation starts at the browser's next frame, and until then (a reload part way down, a re-measure)
    // these are what shows, so even that frame is in the right place.
    function apply(p) {
      if (!L || dead || parked) return;
      var o = state(p);
      if (logoAlways) {
        title.style.transform = 'translate3d(0,' + o.title.y + 'px,0)';
        title.style.opacity = String(o.titleOpacity);
      } else {
        title.style.transform = 'translate3d(' + o.title.x + 'px,' + o.title.y + 'px,0) scale(' + o.title.s + ')';
        title.style.opacity = String(o.titleOpacity);
        if (SDA && SDA.on) {
          logo.style.opacity = String(o.docked);  // under the logo's animation; its visibility is the stylesheet's
        } else {
          // Near the end the title stops being a pre-drawn layer (will-change), so the browser draws it at its real
          // size, as crisp as the logo; otherwise it is a shrunken picture of the big title, a little soft, and the
          // swap would show as a sharpening on phones.
          title.style.willChange = p >= 0.3 ? 'auto' : '';
          setLogo(o.docked);
        }
      }
      if (tagline) {
        tagline.style.opacity = String(o.tagOpacity);
        tagline.style.transform = 'translate3d(0,' + o.tagY + 'px,0)';
      }
      frame.style.transform = 'translate3d(' + o.frame.x + 'px,' + o.frame.y + 'px,0) scale(' + o.frame.sx + ',' + o.frame.sy + ')';
      inner.style.transform = 'translate3d(' + o.inner.x + 'px,' + o.inner.y + 'px,0) scale(' + o.inner.sx + ',' + o.inner.sy + ')';
      if (monoMode) mono.style.opacity = String(o.mono);
      caption.style.opacity = String(o.caption);
    }

    // The scroll-driven path. Keyframes are sampled from state() finely enough that the straight lines between them
    // stay within a fraction of a pixel of the curves (the title every 0.25% of the stretch, the photo every 0.5%);
    // a step (the swap on some screens, the caption) is two keyframes a hair apart.
    var STEP = 0.00001;
    var num = function (v, d) { var m = Math.pow(10, d); return String(Math.round(v * m) / m); };
    var tf = function (x, y, sx, sy) {
      return 'translate3d(' + num(x, 3) + 'px,' + num(y, 3) + 'px,0) scale(' + num(sx, 6) + (sy === undefined ? '' : ',' + num(sy, 6)) + ')';
    };
    function sampled(list, a, b, step, fn) {
      var n = Math.max(1, Math.ceil((b - a) / step - 1e-9));
      for (var i = 0; i <= n; i++) { var p = a + (b - a) * i / n; list.push([p, fn(p)]); }
      return list;
    }
    function stepAt(at, from, to, prop) {
      return [[0, prop + ':' + from], [at - STEP, prop + ':' + from], [at, prop + ':' + to], [1, prop + ':' + to]];
    }
    function keyframesText(name, list) {
      var out = '@keyframes ' + name + '{';
      for (var i = 0; i < list.length; i++) out += num(list[i][0] * 100, 4) + '%{' + list[i][1] + '}';
      return out + '}';
    }
    var ANIM_PROPS = ['animation-name', 'animation-duration', 'animation-timing-function', 'animation-fill-mode',
      'animation-timeline', 'animation-range', 'animation-range-start', 'animation-range-end'];
    function startSDA() {
      if (!SDA || !L) return;
      // Loading measures the page several times (fonts, images, the tagline's size), usually to the same result: then
      // the keyframes already in the sheet are reused, and only the animations are put back.
      var sig = JSON.stringify([L.T, L.F, L.Ti, L.Lg, L.coverW, L.coverH, L.heroTop, L.pin, L.curve, fadeFor()]);
      if (sig === SDA.sig && SDA.set) { play(SDA.set); return; }
      var g = 'handoff' + (++SDA.gen) + '-', css = '', set = [];
      var add = function (el, parts) {
        if (!el) return;
        var names = parts.map(function (part) { css += keyframesText(g + part[0], part[1]); return g + part[0]; });
        set.push([el, names.join(',')]);
      };
      var titleMove = function (p) { var t = state(p).title; return 'transform:' + tf(t.x, t.y, t.s); };
      if (logoAlways) {
        add(title, [['title', [0, 0.06, 0.4, 1].map(function (p) { var o = state(p); return [p, 'transform:' + tf(o.title.x, o.title.y, 1) + ';opacity:' + num(o.titleOpacity, 4)]; })]]);
      } else {
        var move = sampled([], 0, DOCK, 0.0025, titleMove);
        move.push([1, move[move.length - 1][1]]);
        var fade = SDA.fade = fadeFor();
        if (fade) {
          add(title, [['title', move], ['title-swap', [[0, 'opacity:1'], [DOCK + fade, 'opacity:1'], [DOCK + 2 * fade, 'opacity:0'], [1, 'opacity:0']]]]);
          add(logo, [['logo', [[0, 'opacity:0'], [DOCK, 'opacity:0'], [DOCK + fade, 'opacity:1'], [1, 'opacity:1']]]]);
        } else {
          add(title, [['title', move], ['title-swap', stepAt(DOCK, 1, 0, 'opacity')]]);
          add(logo, [['logo', stepAt(DOCK, 0, 1, 'opacity')]]);
        }
      }
      add(tagline, [['tagline', [[0, 'opacity:1;transform:translate3d(0,0px,0)'], [0.03, 'opacity:0;transform:translate3d(0,-12px,0)'],
        [1, 'opacity:0;transform:translate3d(0,-12px,0)']]]]);
      var fr = [], inn = [];
      var photo = function (p) {
        var o = state(p);
        fr.push([p, 'transform:' + tf(o.frame.x, o.frame.y, o.frame.sx, o.frame.sy)]);
        inn.push([p, 'transform:' + tf(o.inner.x, o.inner.y, o.inner.sx, o.inner.sy)]);
      };
      photo(0);
      sampled([], 0.08, 0.86, 0.005, function (p) { photo(p); return ''; });
      photo(1);
      add(frame, [['frame', fr]]);
      add(inner, [['inner', inn]]);
      if (monoMode) {
        var mo = [[0, 'opacity:1']];
        sampled(mo, 0.15, 0.75, 0.01, function (p) { return 'opacity:' + num(state(p).mono, 4); });
        mo.push([1, 'opacity:0']);
        add(mono, [['mono', mo]]);
      }
      add(caption, [['caption', stepAt(0.86, 0, 1, 'opacity')]]);
      try {
        SDA.sheet.replaceSync(css);
      } catch (e) { SDA = null; return; }
      SDA.sig = sig;
      SDA.set = set;
      play(set);
    }
    function play(set) {
      var range = [num(L.heroTop, 3) + 'px', num(L.heroTop + L.pin, 3) + 'px'];
      set.forEach(function (item) {
        var s = item[0].style;
        s.setProperty('animation-name', item[1]);
        s.setProperty('animation-duration', '1ms');   // engines without 'auto' scale a time to the range
        s.setProperty('animation-duration', 'auto');
        s.setProperty('animation-timing-function', 'linear');
        s.setProperty('animation-fill-mode', 'both');
        s.setProperty('animation-timeline', 'scroll(root block)');
        s.setProperty('animation-range', range.join(' '));
        s.setProperty('animation-range-start', range[0]);
        s.setProperty('animation-range-end', range[1]);
      });
      SDA.els = set.map(function (item) { return item[0]; });
      SDA.on = true;
      doc.classList.add('handoff-sda');
      // If the browser did not tie every animation to the scroll position, use the script path for good.
      var tied = SDA.els.every(function (el) {
        var list = el.getAnimations ? el.getAnimations() : [];
        return list.length > 0 && list.every(function (an) { return an.timeline && an.timeline !== document.timeline; });
      });
      if (!tied) { stopSDA(); SDA = null; return; }
      apply(current);
    }
    function stopSDA() {
      if (!SDA || !SDA.on) return;
      SDA.els.forEach(function (el) { ANIM_PROPS.forEach(function (prop) { el.style.removeProperty(prop); }); });
      SDA.els = [];
      SDA.on = false;
      doc.classList.remove('handoff-sda');
      logo.removeAttribute('inert');
      logo.classList.remove('is-held');
    }
    // In the scroll-driven path the browser sets the logo's opacity. Whether it can be focused or clicked is set here
    // from the same progress: inert while it is invisible, unless it has focus (then it stays, and shows) or the
    // phone menu is open (which shows it).
    function syncLogo() {
      if (!SDA || !SDA.on || logoAlways || !L) return;
      var docked = clamp((window.scrollY - L.heroTop) / L.pin) >= DOCK + SDA.fade;  // fully shown
      var focused = document.activeElement === logo;
      var usable = docked || focused || doc.classList.contains('menu-open');
      if (usable && logo.hasAttribute('inert')) logo.removeAttribute('inert');
      else if (!usable && !logo.hasAttribute('inert')) logo.setAttribute('inert', '');
      logo.classList.toggle('is-held', focused && !docked);
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
      if (SDA && SDA.on) {
        // The browser moves it; the logo check runs with the header update. Once, part way through, confirm the
        // browser's own frame matches the path (an engine that ignored the range would spread the hand-off over
        // the whole page); if it does not, the script plays it from here on. Checked in the next frame: the
        // browser reads the scroll position for its animations once per frame, after scroll events.
        if (!SDA.checked && !SDA.checking && target > 0.02 && target < 0.98) {
          SDA.checking = true;
          var waited = 0;
          window.requestAnimationFrame(function check() {
            if (!SDA || !SDA.on || dead || parked || !L) { if (SDA) SDA.checking = false; return; }
            // A re-measure (loading, a resize) puts the animations back, and a new one has no progress until the
            // browser starts it at its next frame: wait for that, ten frames at most, rather than judge it.
            var first = title.getAnimations ? title.getAnimations()[0] : null;
            if (first && first.pending && ++waited < 10) { window.requestAnimationFrame(check); return; }
            SDA.checking = false;
            var p = clamp((window.scrollY - L.heroTop) / L.pin);
            if (p > 0.02 && p < 0.98) checkSDA(p);
          });
        }
        return;
      }
      if (!raf) raf = window.requestAnimationFrame(tick);
    }
    function checkSDA(p) {
      SDA.checked = true;
      // The browser's own progress for the title's animation must match the scroll position (the range is honoured),
      // and what it draws at that progress must match the path (the keyframes are applied). Compared at the
      // browser's progress, so rounding of the scroll position cannot fail it.
      var list = title.getAnimations ? title.getAnimations() : [];
      var timing = list.length && list[0].effect && list[0].effect.getComputedTiming ? list[0].effect.getComputedTiming() : null;
      var prog = timing && typeof timing.progress === 'number' ? timing.progress : -1;
      var read = function (el) {
        var m = /matrix(3d)?\(([^)]+)\)/.exec(getComputedStyle(el).transform || '');
        if (!m) return null;
        var n = m[2].split(',').map(parseFloat);
        return m[1] ? { sx: n[0], sy: n[5], x: n[12], y: n[13] } : { sx: n[0], sy: n[3], x: n[4], y: n[5] };
      };
      var near = function (a, b, tol) { return Math.abs(a - b) <= tol; };
      var ok = near(prog, p, 0.02);
      if (ok) {
        var o = state(prog), t = read(title), f = read(frame);
        ok = !!(t && f) &&
          near(t.sx, o.title.s, 0.01 * o.title.s + 0.002) && near(t.x, o.title.x, 2) && near(t.y, o.title.y, 2) &&
          near(f.sx, o.frame.sx, 0.01 * o.frame.sx + 0.002) && near(f.sy, o.frame.sy, 0.01 * o.frame.sy + 0.002) &&
          near(f.x, o.frame.x, 2) && near(f.y, o.frame.y, 2);
      }
      if (!ok) { stopSDA(); SDA = null; current = target = p; apply(current); updateRule(); }
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
      if (SDA) startSDA();  // writes the plain styles under its animations too
      if (!SDA || !SDA.on) apply(current);
      updateRule();
    }
    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { relayout(false); }, 120);
    }

    function onLoad() { relayout(true); }
    // Back to this page from the browser's back-forward cache: put the animations back. Safari 26.4 plays scroll-driven
    // animations off the main thread but did not register a restored page's timelines there again (fixed in 26.5), so
    // the hand-off would stop following the scroll. Cheap: the keyframes are reused.
    function onPageShow(e) { if (e.persisted) relayout(true); }
    // Text that changes size after load (fonts arriving, a text-spacing tool, a larger default size) re-measures.
    var sizeWatch = window.ResizeObserver && tagline ? new ResizeObserver(function () { window.requestAnimationFrame(function () { relayout(true); }); }) : null;

    // Back to the static layout: no inline styles left behind.
    function toStatic() {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      stopSDA();
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
      window.removeEventListener('pageshow', onPageShow);
      if (sizeWatch) sizeWatch.disconnect();
      window.clearTimeout(resizeTimer);
      toStatic();
      if (probe.parentNode) probe.parentNode.removeChild(probe);
    }

    withRule = syncLogo;
    logo.addEventListener('focus', syncLogo);
    logo.addEventListener('blur', syncLogo);
    relayout(true);
    if (dead) return null;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { relayout(true); });
    window.addEventListener('load', onLoad);
    window.addEventListener('pageshow', onPageShow);
    if (sizeWatch) sizeWatch.observe(tagline);
    listen(mq('(prefers-reduced-motion: reduce)'), function (e) { if (e.matches) teardown(); });
    return { relayout: relayout };
  })();

  updateRule();
  window.addEventListener('scroll', updateRule, { passive: true });
  if (!handoff) doc.classList.remove('js-handoff');
})();
