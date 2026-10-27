/*
 * Pointer effect, adapted from React Bits BorderGlow to plain JS.
 *
 *  [data-border-glow]  A brass glow that follows the cursor around the card's edge.
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
  function setupGlow(el) {
    el.classList.add('border-glow');
    var light = document.createElement('span');
    light.className = 'border-glow__light';
    light.setAttribute('aria-hidden', 'true');
    el.appendChild(light);
    el.addEventListener('pointermove', function (event) {
      var rect = el.getBoundingClientRect();
      var cx = rect.width / 2, cy = rect.height / 2;
      var dx = event.clientX - rect.left - cx, dy = event.clientY - rect.top - cy;
      // How close to the edge (0 = centre, 1 = edge), as in the original.
      var kx = dx ? cx / Math.abs(dx) : Infinity, ky = dy ? cy / Math.abs(dy) : Infinity;
      var edge = clamp(1 / Math.min(kx, ky), 0, 1);
      var angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      if (angle < 0) angle += 360;
      el.style.setProperty('--edge-proximity', (edge * 100).toFixed(2));
      el.style.setProperty('--cursor-angle', angle.toFixed(2) + 'deg');
    });
  }

  function init() {
    document.querySelectorAll('[data-border-glow]').forEach(setupGlow);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
