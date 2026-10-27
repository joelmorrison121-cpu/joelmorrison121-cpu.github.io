/* Joel Morrison — plain browser JavaScript.
 * The supplied React Bits GradientASCII, ClickSpark and StaggeredMenu behaviors are
 * adapted to native WebGL, Canvas and CSS. No modules or build step required.
 */
(() => {
  'use strict';

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const year = document.querySelector('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  // A failure in a decorative effect must never prevent navigation from working.
  function enhance(name, setup) {
    try { setup(); }
    catch (error) { console.warn(`${name} unavailable; using the static fallback.`, error); }
  }

  // -------------------------------------------------------------------------
  // STAGGERED MENU — HTML holds the links; CSS provides a reversible timeline.
  // -------------------------------------------------------------------------
  function setupMenu() {
    const root = document.querySelector('#staggered-menu-root');
    const wrapper = root?.querySelector('.staggered-menu-wrapper');
    const toggle = root?.querySelector('.sm-toggle');
    const panel = root?.querySelector('#staggered-menu-panel');
    if (!root || !wrapper || !toggle || !panel) return;
    const background = [document.querySelector('main'), document.querySelector('.site-footer')];
    const logo = root.querySelector('.sm-logo');
    const scrim = root.querySelector('.menu-scrim');
    let focusTimer = 0;
    let open = false;

    function setOpen(next, returnFocus = false) {
      open = next;
      window.clearTimeout(focusTimer);
      wrapper.dataset.open = String(open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      panel.setAttribute('aria-hidden', String(!open));
      panel.inert = !open;
      document.body.classList.toggle('menu-open', open);
      background.forEach(element => { if (element) element.inert = open; });
      if (open) {
        focusTimer = window.setTimeout(() => {
          if (open) panel.querySelector('a')?.focus({ preventScroll: true });
        }, motionQuery.matches ? 0 : 750);
      } else if (returnFocus) {
        toggle.focus({ preventScroll: true });
      }
    }

    toggle.addEventListener('click', () => setOpen(!open));
    scrim.addEventListener('click', () => setOpen(false, true));
    logo.addEventListener('click', () => setOpen(false));
    panel.querySelectorAll('a[href]').forEach(link => {
      link.addEventListener('click', () => {
        setOpen(false);
        const href = link.getAttribute('href');
        if (!href.startsWith('#')) {
          toggle.focus({ preventScroll: true });
          return;
        }
        const target = document.querySelector(href);
        const heading = target?.querySelector('h2') || target;
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
      });
    });
    document.addEventListener('keydown', event => {
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false, true);
      }
      if (event.key === 'Tab') {
        const elements = [logo, toggle, ...panel.querySelectorAll('a[href]')];
        const index = elements.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) {
          event.preventDefault();
          elements[elements.length - 1].focus();
        } else if (!event.shiftKey && (index < 0 || index === elements.length - 1)) {
          event.preventDefault();
          elements[0].focus();
        }
      }
    });
    root.hidden = false;
    document.documentElement.classList.add('menu-enhanced');
  }

  // Native disclosure menus and the archive folder still work without scripts.
  function setupDisclosures() {
    document.querySelectorAll('details').forEach(details => {
      details.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => { details.open = false; });
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && details.open) {
          details.open = false;
          details.querySelector('summary')?.focus();
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // CLICK SPARK — the same radial, shrinking lines as the supplied component.
  // A frame is scheduled only when particles exist. It never blocks a click.
  // -------------------------------------------------------------------------
  function setupClickSpark() {
    const canvas = document.querySelector('#click-spark-canvas');
    const context = canvas?.getContext('2d');
    if (!context) return;
    const settings = { count: 8, size: 13, radius: 32, duration: 480, color: '#eed09a' };
    let sparks = [];
    let ratio = 1;
    let frame = 0;

    function clear() {
      window.cancelAnimationFrame(frame);
      frame = 0;
      sparks = [];
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      canvas.dataset.active = 'false';
    }
    function resize() {
      clear();
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function draw(now) {
      frame = 0;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      sparks = sparks.filter(spark => now - spark.started < settings.duration);
      for (const spark of sparks) {
        const progress = Math.max(0, (now - spark.started) / settings.duration);
        const eased = progress * (2 - progress);
        const distance = eased * settings.radius;
        const length = settings.size * (1 - eased);
        const cosine = Math.cos(spark.angle);
        const sine = Math.sin(spark.angle);
        context.strokeStyle = settings.color;
        context.lineWidth = 1.7;
        context.globalAlpha = 1 - progress * 0.65;
        context.beginPath();
        context.moveTo(spark.x + distance * cosine, spark.y + distance * sine);
        context.lineTo(spark.x + (distance + length) * cosine, spark.y + (distance + length) * sine);
        context.stroke();
      }
      context.globalAlpha = 1;
      canvas.dataset.active = String(sparks.length > 0);
      if (sparks.length) frame = window.requestAnimationFrame(draw);
    }
    document.addEventListener('click', event => {
      // Keyboard link activation has no pointer position and should not spark.
      if (motionQuery.matches || document.hidden || event.detail === 0) return;
      const started = performance.now();
      for (let index = 0; index < settings.count; index += 1) {
        sparks.push({ x: event.clientX, y: event.clientY, angle: 2 * Math.PI * index / settings.count, started });
      }
      sparks = sparks.slice(-160);
      canvas.dataset.active = 'true';
      if (!frame) frame = window.requestAnimationFrame(draw);
    }, { capture: true, passive: true });
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
    motionQuery.addEventListener('change', () => { if (motionQuery.matches) clear(); });
    resize();
  }

  // -------------------------------------------------------------------------
  // TYPEWRITER — visual text changes; its accessible label remains stable.
  // -------------------------------------------------------------------------
  function typeLabel(element, phrases, initialDelay) {
    if (!element) return;
    const stable = document.createElement('span');
    stable.className = 'sr-only';
    stable.textContent = phrases[0];
    const visual = document.createElement('span');
    visual.className = 'type-animation';
    visual.setAttribute('aria-hidden', 'true');
    const cursor = document.createElement('span');
    cursor.className = 'type-cursor';
    cursor.textContent = '|';
    cursor.setAttribute('aria-hidden', 'true');
    element.replaceChildren(stable, visual, cursor);
    let phrase = 0;
    let character = 0;
    let deleting = false;
    let timer = 0;

    function tick() {
      timer = 0;
      if (document.hidden || motionQuery.matches) return;
      const text = phrases[phrase];
      character = Math.max(0, Math.min(text.length, character + (deleting ? -1 : 1)));
      visual.textContent = text.slice(0, character);
      let delay = deleting ? 35 : 70;
      if (!deleting && character === text.length) { deleting = true; delay = 2300; }
      else if (deleting && character === 0) { deleting = false; phrase = (phrase + 1) % phrases.length; delay = 300; }
      timer = window.setTimeout(tick, delay);
    }
    function sync() {
      window.clearTimeout(timer);
      if (motionQuery.matches) {
        visual.textContent = phrases[0];
        cursor.hidden = true;
      } else {
        cursor.hidden = false;
        visual.textContent = phrases[phrase].slice(0, character);
        if (!document.hidden) timer = window.setTimeout(tick, initialDelay);
      }
    }
    document.addEventListener('visibilitychange', sync);
    motionQuery.addEventListener('change', sync);
    sync();
  }

  // -------------------------------------------------------------------------
  // TECH NAME — true HTML glyphs, an outlined moving selection and tiny specks.
  // DOM bounds keep the outline aligned with the actual font and letter spacing.
  // -------------------------------------------------------------------------
  function techName(line) {
    const label = line?.querySelector('.name-fallback');
    if (!label) return;
    const text = label.textContent;
    label.setAttribute('aria-hidden', 'true');
    label.replaceChildren(...Array.from(text, character => {
      const glyph = document.createElement('span');
      glyph.className = 'tech-glyph';
      glyph.textContent = character;
      return glyph;
    }));
    const glyphs = [...label.children];
    const canvas = document.createElement('canvas');
    canvas.className = 'tech-name-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    line.append(canvas);
    const context = canvas.getContext('2d');
    if (!context) return;
    let boxes = [];
    let width = 1;
    let height = 1;
    let frame = 0;
    let lastPaint = 0;
    let clock = 0;
    let visible = true;
    let hoverIndex = -1;
    let selected = -1;

    function layout() {
      window.cancelAnimationFrame(frame);
      frame = 0;
      const rect = line.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      boxes = glyphs.map(glyph => {
        const box = glyph.getBoundingClientRect();
        return { x: box.left - rect.left, y: Math.max(1, box.top - rect.top + 8), width: box.width, height: Math.min(height - 10, box.height - 14) };
      });
      wake();
    }
    function paint(now) {
      frame = 0;
      if (document.hidden || !visible || motionQuery.matches) return;
      if (now - lastPaint > 42) {
        clock += Math.min(0.08, (now - (lastPaint || now)) / 1000);
        lastPaint = now;
        const index = hoverIndex >= 0 ? hoverIndex : Math.floor(clock / 1.15) % glyphs.length;
        if (selected !== index) {
          glyphs[selected]?.classList.remove('is-outlined');
          glyphs[index]?.classList.add('is-outlined');
          selected = index;
        }
        const box = boxes[index];
        context.clearRect(0, 0, width, height);
        if (box) {
          context.strokeStyle = 'rgba(214,183,123,.6)';
          context.lineWidth = 0.8;
          context.setLineDash([3, 4]);
          context.strokeRect(box.x + 0.5, box.y + 0.5, Math.max(1, box.width - 1), Math.max(1, box.height));
          context.setLineDash([]);
          context.fillStyle = '#d6b77b';
          for (const [x, y] of [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]) {
            context.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
          }
          for (let speck = 0; speck < 5; speck += 1) {
            context.globalAlpha = 0.4 + 0.4 * Math.abs(Math.sin(clock * 3 + speck));
            const x = box.x + Math.abs(Math.sin(clock * 1.7 + speck * 5)) * box.width;
            const y = box.y + Math.abs(Math.cos(clock * 2 + speck * 9)) * box.height;
            context.fillRect(Math.round(x), Math.round(y), speck % 2 + 1, speck % 2 + 1);
          }
          context.globalAlpha = 1;
        }
      }
      frame = window.requestAnimationFrame(paint);
    }
    function wake() {
      if (!frame && visible && !document.hidden && !motionQuery.matches) frame = window.requestAnimationFrame(paint);
    }
    glyphs.forEach((glyph, index) => glyph.addEventListener('pointerenter', () => { hoverIndex = index; }));
    line.addEventListener('pointerleave', () => { hoverIndex = -1; });
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(line);
    else window.addEventListener('resize', layout, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) { window.cancelAnimationFrame(frame); frame = 0; }
      else wake();
    }).observe(line);
    document.fonts?.ready.then(layout);
    document.addEventListener('visibilitychange', () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      lastPaint = 0;
      wake();
    });
    motionQuery.addEventListener('change', () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      glyphs.forEach(glyph => glyph.classList.remove('is-outlined'));
      selected = -1;
      context.clearRect(0, 0, width, height);
      wake();
    });
    layout();
  }

  // GRADIENT ASCII — the supplied multi-pass renderer is readable in gradient-ascii.js.
  // Settings can be hand-edited here. Decorative failures cannot block content.
  function setupASCII() {
    if (!window.startGradientASCII) return;
    window.startGradientASCII(document.querySelector('#ascii-root'), {
      // React Bits GradientASCII defaults, in the site's warm palette:
      // edge of the shadow -> brightest point (brass, cream, pale gold, deep brass).
      colors: ['#5e4626', '#e9d8b4', '#d9b878', '#a8803f'],
      shape: 'horizon',
      characters: ' =+xX0S8#@',
      cellSize: 18,
      density: 0.8,
      glyphOpacity: 0.85,
      gradientOpacity: 0.5,
      glow: 0.2,
      depthOfField: 0,
      flicker: 0.2,
      softness: 0.5,
      scale: 1,
      flow: 0.5,
      speed: 1,
      grain: 0.08,
      variation: 0,
      scrambleRadius: 0.1,
      clickEffect: 'wave',
      maxFps: 30,
      maxDpr: 2
    });
  }

  // One-time, progressive section entrances; nothing is hidden without JS.
  function setupReveals() {
    if (motionQuery.matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.section-heading, .featured-project, .skill-evidence').forEach(element => {
      element.classList.add('reveal-ready');
      observer.observe(element);
    });
  }

  enhance('Navigation', setupMenu);
  enhance('Disclosure links', setupDisclosures);
  enhance('Click sparks', setupClickSpark);
  enhance('Small typed labels', () => {
    typeLabel(document.querySelector('#hero-type-kicker'), ['Dublin · Software', 'Building web & AI', 'DCU · Redbrick'], 350);
    typeLabel(document.querySelector('#hero-type-meta'), ['Year 2 · DCU · Class of 2029', 'Python · Web development · AI', 'Open to work opportunities'], 900);
  });
  enhance('First-name animation', () => techName(document.querySelector('.hero-name-line.first')));
  enhance('Surname animation', () => techName(document.querySelector('.hero-name-line.last')));
  enhance('Gradient ASCII', setupASCII);
  enhance('Section entrances', setupReveals);
})();
