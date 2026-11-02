/*
 * Pointer effects, adapted from React Bits to plain JS.
 *
 *  [data-border-glow]  BorderGlow: a brass glow that follows the cursor around the card's edge.
 *  GLARE_TARGETS       GlareHover: a soft streak of light sweeps across on hover.
 *
 * It does nothing on touch-only devices or with prefers-reduced-motion, and the
 * page works the same without them.
 */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (reduced.matches || !finePointer.matches) return;

  var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };

  // ---------------------------------------------------------------- BorderGlow
  // The last known pointer position, so the glow can follow the card while the
  // page scrolls under a still mouse (pointermove doesn't fire then).
  var pointer = null;
  var glowElements = [];
  window.addEventListener('pointermove', function (event) {
    if (event.pointerType === 'mouse') pointer = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { pointer = null; });

  function placeGlow(el, x, y) {
    var rect = el.getBoundingClientRect();
    var inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    el.classList.toggle('is-glowing', inside);
    if (!inside) return;
    var cx = rect.width / 2, cy = rect.height / 2;
    var dx = x - rect.left - cx, dy = y - rect.top - cy;
    var kx = dx ? cx / Math.abs(dx) : Infinity, ky = dy ? cy / Math.abs(dy) : Infinity;
    var edge = clamp(1 / Math.min(kx, ky), 0, 1);
    var angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    if (angle < 0) angle += 360;
    el.style.setProperty('--edge-proximity', (edge * 100).toFixed(2));
    el.style.setProperty('--cursor-angle', angle.toFixed(2) + 'deg');
  }

  var scrollFrame = 0;
  window.addEventListener('scroll', function () {
    if (scrollFrame || !pointer) return;
    scrollFrame = requestAnimationFrame(function () {
      scrollFrame = 0;
      if (!pointer) return;
      glowElements.forEach(function (el) { placeGlow(el, pointer.x, pointer.y); });
    });
  }, { passive: true });

  function setupGlow(el) {
    glowElements.push(el);
    el.classList.add('border-glow');
    var light = document.createElement('span');
    light.className = 'border-glow__light';
    light.setAttribute('aria-hidden', 'true');
    el.appendChild(light);
    el.addEventListener('pointerleave', function () { el.classList.remove('is-glowing'); });
    el.addEventListener('pointermove', function (event) {
      var rect = el.getBoundingClientRect();
      var cx = rect.width / 2, cy = rect.height / 2;
      var dx = event.clientX - rect.left - cx, dy = event.clientY - rect.top - cy;
      el.classList.add('is-glowing');
      // How close to the edge (0 = centre, 1 = edge), as in the original.
      var kx = dx ? cx / Math.abs(dx) : Infinity, ky = dy ? cy / Math.abs(dy) : Infinity;
      var edge = clamp(1 / Math.min(kx, ky), 0, 1);
      var angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      if (angle < 0) angle += 360;
      el.style.setProperty('--edge-proximity', (edge * 100).toFixed(2));
      el.style.setProperty('--cursor-angle', angle.toFixed(2) + 'deg');
    });
  }

  // ---------------------------------------------------------------- GlareHover
  // Which elements get a glare, and how strong. Edit here.
  var GLARE_TARGETS = [
    { selector: '.button-primary', opacity: 0.55, size: 34 },
    { selector: '.contact-methods a', opacity: 0.22, size: 26, playOnce: true, group: 'contact', groupCooldown: 1400 },
    { selector: '#crash-course', opacity: 0.16, size: 22, playOnce: true, rim: false },
    { selector: '.hackathon-projects article', opacity: 0.16, size: 26, playOnce: true },
    { selector: '.demo-disclosure summary', opacity: 0.3, size: 30, playOnce: true }
  ];
  var GLARE_COLOR = '#fff2d8';
  // A glare can't replay on the same element for this long (ms). Targets with a
  // `group` also share a cooldown, so sweeping the mouse down the contact list
  // gives one glare, not one per row.
  var GLARE_COOLDOWN = 2200;
  var groupLastSweep = {};

  var smootherstep = function (t) { return t * t * t * (t * (t * 6 - 15) + 10); };
  var bump = function (t, centre, half) {
    var d = Math.abs(t - centre);
    return d >= half ? 0 : smootherstep(1 - d / half);
  };
  var streak = function (t, softness) { return bump(t, 0.5, 0.06 + 0.16 * softness) + 0.32 * bump(t, 0.5, 0.5); };
  function glareGradient(color, opacity, softness) {
    var stops = [];
    for (var i = 0; i <= 32; i++) {
      var t = i / 32;
      var alpha = Math.round(Math.min(1, streak(t, softness) * opacity) * 1000) / 10;
      stops.push('color-mix(in srgb, ' + color + ' ' + alpha + '%, transparent) ' + (t * 100).toFixed(1) + '%');
    }
    return 'linear-gradient(90deg, ' + stops.join(', ') + ')';
  }
  var easeInOut = function (t) { return (1 - Math.cos(Math.PI * t)) / 2; };

  function setupGlare(root, options) {
    var angle = options.angle == null ? -45 : options.angle;
    var size = options.size || 30;
    var duration = options.duration || 650;
    var softness = options.softness == null ? 0.6 : options.softness;
    var opacity = options.opacity == null ? 0.5 : options.opacity;

    root.classList.add('glare-host');
    if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
    root.style.setProperty('--gh-glare', glareGradient(GLARE_COLOR, opacity, softness));
    root.style.setProperty('--gh-rim', glareGradient(GLARE_COLOR, Math.min(1, opacity * 1.8), softness));

    // An <i>, not a <span>, so rules like `a > span:last-child` never match it.
    var glare = document.createElement('i');
    glare.className = 'glare-hover__glare';
    glare.setAttribute('aria-hidden', 'true');
    var band = document.createElement('span');
    band.className = 'glare-hover__band';
    glare.appendChild(band);
    var bands = [band];
    if (options.rim !== false) {
      var rim = document.createElement('span');
      rim.className = 'glare-hover__rim';
      var rimBand = document.createElement('span');
      rimBand.className = 'glare-hover__band glare-hover__band--rim';
      rim.appendChild(rimBand);
      glare.appendChild(rim);
      bands.push(rimBand);
    }
    root.appendChild(glare);

    var geo = { reach: 0, ux: 0, uy: -1 };
    var state = { pos: -1e4, sweep: null };
    var raf = 0;

    function write() {
      var transform = 'translate(-50%, -50%) rotate(' + (angle - 90) + 'deg) translateX(' + state.pos.toFixed(2) + 'px)';
      bands.forEach(function (b) { b.style.transform = transform; });
    }
    function measure() {
      var w = root.clientWidth, h = root.clientHeight;
      var rad = angle * Math.PI / 180;
      geo.ux = Math.sin(rad); geo.uy = -Math.cos(rad);
      var diagonal = Math.hypot(w, h);
      var width = Math.max(8, diagonal * size / 100);
      geo.reach = (Math.abs(w * geo.ux) + Math.abs(h * geo.uy)) / 2 + width / 2 + 2;
      bands.forEach(function (b) { b.style.width = width + 'px'; b.style.height = (diagonal + width) + 'px'; });
      if (!state.sweep) state.pos = state.pos > 0 ? geo.reach : -geo.reach;
      glare.style.opacity = '1';
      write();
    }
    function frame(now) {
      var s = state.sweep;
      if (!s) { raf = 0; return; }
      var t = Math.min(1, (now - s.start) / s.duration);
      state.pos = s.from + (s.to - s.from) * easeInOut(t);
      write();
      if (t < 1) raf = requestAnimationFrame(frame);
      else { state.sweep = null; raf = 0; }
    }
    var lastSweep = -Infinity;
    // Sweeps started by the pointer arriving are rate-limited; the sweep back
    // out on leaving (buttons only) is not, so a started glare always finishes.
    function sweepIn(sign) {
      var now = performance.now();
      if (state.sweep) return;
      if (now - lastSweep < (options.cooldown || GLARE_COOLDOWN)) return;
      if (options.group && now - (groupLastSweep[options.group] || -Infinity) < (options.groupCooldown || 0)) return;
      lastSweep = now;
      if (options.group) groupLastSweep[options.group] = now;
      sweep(sign);
    }
    function sweep(sign) {
      if (!geo.reach) measure();
      var end = sign * geo.reach;
      var from = state.sweep || Math.abs(state.pos) < geo.reach ? state.pos : -end;
      if (from === end) return;
      var share = Math.abs(end - from) / (2 * geo.reach);
      state.sweep = { from: from, to: end, start: performance.now(), duration: Math.max(120, duration * share) };
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function along(event) {
      var rect = root.getBoundingClientRect();
      return (event.clientX - rect.left - rect.width / 2) * geo.ux + (event.clientY - rect.top - rect.height / 2) * geo.uy;
    }
    root.addEventListener('pointerenter', function (event) { sweepIn(along(event) > 0 ? -1 : 1); });
    // Sweep back out on leave only if this hover produced a sweep in.
    if (!options.playOnce) root.addEventListener('pointerleave', function (event) {
      if (Math.abs(state.pos) < geo.reach || state.sweep) sweep(along(event) > 0 ? 1 : -1);
    });
    root.addEventListener('focusin', function (event) { if (event.target.matches && event.target.matches(':focus-visible')) sweepIn(1); });
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(root);
    measure();
  }

  function init() {
    document.querySelectorAll('[data-border-glow]').forEach(setupGlow);
    GLARE_TARGETS.forEach(function (target) {
      document.querySelectorAll(target.selector).forEach(function (el) { setupGlare(el, target); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
