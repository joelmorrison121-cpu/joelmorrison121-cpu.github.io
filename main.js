/* Joel Morrison — plain browser JavaScript.
 * The supplied React Bits Dither, ClickSpark and StaggeredMenu behaviors are
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

  // -------------------------------------------------------------------------
  // DITHER WAVES — original noise field, exact 8×8 Bayer order, one full-screen
  // native WebGL pass. Quantize intensity before tinting: low RGB values are no
  // longer crushed to black by the original postprocessing luminance bias.
  // -------------------------------------------------------------------------
  function setupWaves() {
    const canvas = document.querySelector('#wave-canvas');
    if (!canvas) return;
    const gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: 'low-power', preserveDrawingBuffer: false
    });
    if (!gl) { canvas.hidden = true; return; }
    const events = new AbortController();
    const signal = events.signal;

    // Tweak these native effect settings without a compiler or package install.
    const settings = {
      speed: 0.035,
      frequency: 3,
      amplitude: 0.3,
      colorLevels: 5,
      pixelSize: 2.5,
      mouseRadius: 0.32,
      waveColor: [0.43, 0.33, 0.18],
      backgroundColor: [0.043, 0.039, 0.029]
    };
    const vertexSource = `
      attribute vec2 position;
      void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `;
    const fragmentSource = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform vec2 mousePosition;
      uniform float mouseActive;
      uniform float speed;
      uniform float frequency;
      uniform float amplitude;
      uniform float colorLevels;
      uniform float pixelSize;
      uniform float mouseRadius;
      uniform vec3 waveColor;
      uniform vec3 backgroundColor;

      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
      vec4 inverseSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

      float cnoise(vec2 p) {
        vec4 pi = floor(p.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
        vec4 pf = fract(p.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
        pi = mod289(pi);
        vec4 ix = pi.xzxz;
        vec4 iy = pi.yyww;
        vec4 fx = pf.xzxz;
        vec4 fy = pf.yyww;
        vec4 index = permute(permute(ix) + iy);
        vec4 gx = fract(index / 41.0) * 2.0 - 1.0;
        vec4 gy = abs(gx) - 0.5;
        gx -= floor(gx + 0.5);
        vec2 g00 = vec2(gx.x, gy.x);
        vec2 g10 = vec2(gx.y, gy.y);
        vec2 g01 = vec2(gx.z, gy.z);
        vec2 g11 = vec2(gx.w, gy.w);
        vec4 norm = inverseSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
        g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
        float n00 = dot(g00, vec2(fx.x, fy.x));
        float n10 = dot(g10, vec2(fx.y, fy.y));
        float n01 = dot(g01, vec2(fx.z, fy.z));
        float n11 = dot(g11, vec2(fx.w, fy.w));
        vec2 fadeXY = fade(pf.xy);
        vec2 nx = mix(vec2(n00, n01), vec2(n10, n11), fadeXY.x);
        return 2.3 * mix(nx.x, nx.y, fadeXY.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float gain = 1.0;
        for (int octave = 0; octave < 4; octave++) {
          value += gain * abs(cnoise(p));
          p *= frequency;
          gain *= amplitude;
        }
        return value;
      }

      // This generates the exact matrix supplied with React Bits without the
      // dynamically indexed array/bitwise operators that WebGL 1 disallows.
      float bayer8(vec2 cell) {
        float x = mod(cell.x, 8.0);
        float y = mod(cell.y, 8.0);
        float rank = 0.0;
        for (int bit = 0; bit < 3; bit++) {
          float divisor = pow(2.0, float(bit));
          float xb = mod(floor(x / divisor), 2.0);
          float yb = mod(floor(y / divisor), 2.0);
          float value = xb < 0.5 ? (yb < 0.5 ? 0.0 : 2.0) : (yb < 0.5 ? 3.0 : 1.0);
          float weight = bit == 0 ? 16.0 : (bit == 1 ? 4.0 : 1.0);
          rank += value * weight;
        }
        return (rank + 0.5) / 64.0;
      }

      void main() {
        vec2 cell = floor(gl_FragCoord.xy / pixelSize);
        vec2 pixel = (cell + 0.5) * pixelSize;
        vec2 point = pixel / resolution - 0.5;
        point.x *= resolution.x / resolution.y;
        vec2 drift = point - time * speed;
        float field = fbm(point + fbm(drift));
        if (mouseActive > 0.5) {
          vec2 mouse = mousePosition / resolution - 0.5;
          mouse.x *= resolution.x / resolution.y;
          float influence = 1.0 - smoothstep(0.0, mouseRadius, length(point - mouse));
          field -= 0.35 * influence;
        }
        float intensity = pow(clamp(field, 0.0, 1.0), 1.3);
        float levels = max(1.0, colorLevels - 1.0);
        float quantized = floor(intensity * levels + bayer8(cell)) / levels;
        vec3 color = mix(backgroundColor, waveColor, clamp(quantized, 0.0, 1.0));
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function shader(type, source) {
      const result = gl.createShader(type);
      gl.shaderSource(result, source);
      gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(result));
      }
      return result;
    }
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniform = {};
    for (const name of ['resolution', 'time', 'mousePosition', 'mouseActive', ...Object.keys(settings)]) {
      uniform[name] = gl.getUniformLocation(program, name);
    }
    for (const [name, value] of Object.entries(settings)) {
      if (Array.isArray(value)) gl.uniform3fv(uniform[name], value);
      else gl.uniform1f(uniform[name], value);
    }
    let pointerX = 0;
    let pointerY = 0;
    let pointerActive = false;
    let frame = 0;
    let lastPaint = 0;
    let lastTick = 0;
    let elapsed = 0;
    let lost = false;

    function render() {
      gl.uniform2f(uniform.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniform.time, elapsed);
      // Pointer Y is converted once, from CSS top-left to WebGL bottom-left.
      gl.uniform2f(uniform.mousePosition,
        pointerX * canvas.width / window.innerWidth,
        (window.innerHeight - pointerY) * canvas.height / window.innerHeight);
      gl.uniform1f(uniform.mouseActive, pointerActive ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function tick(now) {
      frame = 0;
      if (document.hidden || motionQuery.matches || lost) return;
      if (lastTick) elapsed += Math.min(0.1, (now - lastTick) / 1000);
      lastTick = now;
      if (now - lastPaint >= 1000 / 30) {
        render();
        lastPaint = now;
      }
      frame = window.requestAnimationFrame(tick);
    }
    function wake() {
      lastTick = 0;
      if (!frame && !document.hidden && !motionQuery.matches && !lost) frame = window.requestAnimationFrame(tick);
    }
    function resize() {
      window.cancelAnimationFrame(frame);
      frame = 0;
      // One framebuffer pixel per CSS pixel; shader cells are 2.5 CSS pixels.
      canvas.width = Math.max(1, window.innerWidth);
      canvas.height = Math.max(1, window.innerHeight);
      gl.viewport(0, 0, canvas.width, canvas.height);
      render();
      wake();
    }
    function cleanup() {
      window.cancelAnimationFrame(frame);
      frame = 0;
      events.abort();
      // A context loss already frees GPU objects. They cannot be deleted in the
      // restored context; only explicitly free them while the original is valid.
      if (!lost) {
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      }
    }
    window.addEventListener('pointermove', event => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerActive = true;
    }, { passive: true, signal });
    const releasePointer = event => {
      if (event.pointerType !== 'mouse') pointerActive = false;
    };
    window.addEventListener('pointerup', releasePointer, { passive: true, signal });
    window.addEventListener('pointercancel', releasePointer, { passive: true, signal });
    document.documentElement.addEventListener('pointerleave', () => { pointerActive = false; }, { signal });
    window.addEventListener('resize', resize, { passive: true, signal });
    document.addEventListener('visibilitychange', () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      wake();
    }, { signal });
    motionQuery.addEventListener('change', () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      wake();
    }, { signal });
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      lost = true;
      window.cancelAnimationFrame(frame);
      frame = 0;
      canvas.hidden = true;
    }, { signal });
    canvas.addEventListener('webglcontextrestored', () => {
      // Remove the old listeners and resources before compiling a fresh renderer.
      // The CSS gradient remains visible during recovery or on a failed restore.
      cleanup();
      enhance('Restored dither waves', setupWaves);
    }, { once: true, signal });
    canvas.hidden = false;
    canvas.dataset.rendered = 'true';
    resize();
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
    document.querySelectorAll('.section-heading, .featured-project, .skills-grid').forEach(element => {
      element.classList.add('reveal-ready');
      observer.observe(element);
    });
  }

  enhance('Navigation', setupMenu);
  enhance('Disclosure links', setupDisclosures);
  enhance('Click sparks', setupClickSpark);
  enhance('Small typed labels', () => {
    typeLabel(document.querySelector('#hero-type-kicker'), ['Dublin · Software', 'Building web & AI', 'DCU · Redbrick'], 350);
    typeLabel(document.querySelector('#hero-type-meta'), ['DCU · Redbrick · Web & AI', 'Python · JavaScript · React', 'Curious about practical tools'], 900);
  });
  enhance('First-name animation', () => techName(document.querySelector('.hero-name-line.first')));
  enhance('Surname animation', () => techName(document.querySelector('.hero-name-line.last')));
  enhance('Dither waves', setupWaves);
  enhance('Section entrances', setupReveals);
})();
