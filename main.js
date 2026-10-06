/*
 * Joel Morrison — portfolio interactions
 *
 * Plain browser JavaScript: no React, dependencies, modules or build step.
 * Works from a local file:// URL as well as from GitHub Pages.
 */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const year = document.querySelector('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  // ---------------------------------------------------------------------------
  // Accessible staggered navigation
  // ---------------------------------------------------------------------------
  const menuRoot = document.querySelector('#staggered-menu-root');
  const menuLinks = [
    ['About', '#about'],
    ['Projects', '#projects'],
    ['Skills', '#skills'],
    ['Experience', '#experience'],
    ['Contact', '#contact']
  ];
  const socialLinks = [
    ['Email', 'mailto:joelmorrison121@gmail.com'],
    ['GitHub', 'https://github.com/joelmorrison121-cpu'],
    ['LinkedIn', 'https://www.linkedin.com/in/joel-morrison-16a304389/']
  ];

  if (menuRoot) {
    const numberedLinks = menuLinks.map(([label, href], index) => `
      <li class="sm-panel-item-wrap">
        <a class="sm-panel-item" href="${href}"><span class="sm-panel-item-label">${label}</span><span class="sm-panel-number">${String(index + 1).padStart(2, '0')}</span></a>
      </li>`).join('');
    const socials = socialLinks.map(([label, href]) => `
      <li><a class="sm-social-link" href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}<span aria-hidden="true"> ↗</span></a></li>`).join('');

    menuRoot.innerHTML = `
      <div class="staggered-menu-wrapper" data-open="false">
        <div class="sm-prelayers" aria-hidden="true"><span></span><span></span><span></span></div>
        <header class="staggered-menu-header">
          <a class="sm-logo" href="#top" aria-label="Joel Morrison, back to top"><span class="wordmark-mark" aria-hidden="true">JM<span class="mark-period">.</span></span><span>Joel <em>Morrison</em></span></a>
          <button class="sm-toggle" type="button" aria-expanded="false" aria-controls="staggered-menu-panel">
            <span class="sm-toggle-label">Menu</span><span class="sm-toggle-icon" aria-hidden="true"><i></i><i></i></span>
          </button>
        </header>
        <nav class="staggered-menu-panel" id="staggered-menu-panel" aria-label="Main menu" aria-hidden="true" inert>
          <div class="sm-panel-inner">
            <p class="sm-panel-title">Explore</p>
            <ol class="sm-panel-list">${numberedLinks}</ol>
            <div class="sm-socials"><p class="sm-socials-title">Elsewhere</p><ul>${socials}</ul></div>
          </div>
        </nav>
      </div>`;

    const wrapper = menuRoot.querySelector('.staggered-menu-wrapper');
    const toggle = menuRoot.querySelector('.sm-toggle');
    const panel = menuRoot.querySelector('.staggered-menu-panel');
    const toggleLabel = menuRoot.querySelector('.sm-toggle-label');

    // Only hide the no-JavaScript fallback after the new menu is ready.
    document.documentElement.classList.add('menu-enhanced');

    function setMenuOpen(open, returnFocus = false) {
      wrapper.dataset.open = String(open);
      toggle.setAttribute('aria-expanded', String(open));
      panel.setAttribute('aria-hidden', String(!open));
      panel.inert = !open;
      toggleLabel.textContent = open ? 'Close' : 'Menu';
      document.body.classList.toggle('menu-open', open);
      if (open) {
        window.setTimeout(() => panel.querySelector('a')?.focus(), reducedMotion.matches ? 0 : 520);
      } else if (returnFocus) {
        toggle.focus();
      }
    }

    toggle.addEventListener('click', () => {
      setMenuOpen(wrapper.dataset.open !== 'true');
    });
    panel.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => setMenuOpen(false));
    });
    document.addEventListener('keydown', event => {
      if (wrapper.dataset.open !== 'true') return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false, true);
      }
      if (event.key === 'Tab') {
        const focusable = [...panel.querySelectorAll('a[href]')];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  // Static navigation remains functional as a fallback and on wider screens.
  const fallbackMenu = document.querySelector('.mobile-nav');
  fallbackMenu?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => { fallbackMenu.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && fallbackMenu?.open) {
      fallbackMenu.open = false;
      fallbackMenu.querySelector('summary')?.focus();
    }
  });

  // Folder contents close after selecting a destination.
  const folder = document.querySelector('#project-folder');
  folder?.querySelectorAll('.folder-contents a').forEach(link => {
    link.addEventListener('click', () => { folder.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && folder?.open) {
      folder.open = false;
      folder.querySelector('summary')?.focus();
    }
  });

  // Highlight the section currently being read in the no-JavaScript nav too.
  if ('IntersectionObserver' in window) {
    const links = [...document.querySelectorAll('.desktop-nav a[href^="#"]')];
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach(link => {
        if (link.getAttribute('href') === `#${visible.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-20% 0px -50% 0px', threshold: [0, 0.2, 0.5] });
    document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
  }

  // ---------------------------------------------------------------------------
  // Typewriter for the small editorial labels. Static screen-reader text stays put.
  // ---------------------------------------------------------------------------
  function startTypewriter(element, phrases, initialDelay = 0) {
    if (!element || reducedMotion.matches) return;
    const screenReaderText = document.createElement('span');
    screenReaderText.className = 'sr-only';
    screenReaderText.textContent = phrases[0];
    const animation = document.createElement('span');
    animation.className = 'type-animation';
    animation.setAttribute('aria-hidden', 'true');
    const cursor = document.createElement('span');
    cursor.className = 'type-cursor';
    cursor.textContent = '|';
    cursor.setAttribute('aria-hidden', 'true');
    element.replaceChildren(screenReaderText, animation, cursor);

    let phraseIndex = 0;
    let characterIndex = 0;
    let deleting = false;
    let timer;

    function step() {
      if (document.hidden || reducedMotion.matches) {
        animation.textContent = phrases[phraseIndex];
        timer = window.setTimeout(step, 500);
        return;
      }
      const phrase = phrases[phraseIndex];
      characterIndex += deleting ? -1 : 1;
      animation.textContent = phrase.slice(0, characterIndex);

      let delay = deleting ? 34 : 68;
      if (!deleting && characterIndex === phrase.length) {
        deleting = true;
        delay = 2050;
      } else if (deleting && characterIndex === 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        delay = 300;
      }
      timer = window.setTimeout(step, delay);
    }

    timer = window.setTimeout(step, initialDelay);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        window.clearTimeout(timer);
        timer = window.setTimeout(step, 100);
      }
    });
    reducedMotion.addEventListener?.('change', event => {
      if (event.matches) {
        window.clearTimeout(timer);
        animation.textContent = phrases[0];
        cursor.hidden = true;
      }
    });
  }

  startTypewriter(document.querySelector('#hero-type-kicker'), [
    'Dublin · Software', 'Building web & AI', 'DCU · Redbrick'
  ], 350);
  startTypewriter(document.querySelector('#hero-type-meta'), [
    'DCU · Redbrick · Web & AI', 'Python · JavaScript · React', 'Curious about practical tools'
  ], 900);

  // ---------------------------------------------------------------------------
  // TechText-style name: readable serif text with a moving, pixel-speckled glyph lens.
  // ---------------------------------------------------------------------------
  function startTechName(line) {
    if (!line || reducedMotion.matches) return;
    const label = line.querySelector('.name-fallback');
    if (!label) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'tech-name-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    line.append(canvas);
    const context = canvas.getContext('2d');
    if (!context) return;

    let width = 1;
    let height = 1;
    let ratio = 1;
    let frame = 0;
    let lastTime = 0;
    let clock = 0;
    let pointerActive = false;
    let pointerX = 0;
    let pointerY = 0;
    let bounds = [];
    const isLast = line.classList.contains('last');
    const ink = isLast ? '#eed09a' : '#f2ece2';
    const brass = '#d6b77b';

    function prepareGlyphs() {
      const styles = getComputedStyle(line);
      context.font = `${styles.fontStyle} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      context.textBaseline = 'alphabetic';
      const text = label.textContent;
      const metrics = context.measureText(text);
      const scale = Math.min(1, (width * 0.96) / Math.max(metrics.width, 1));
      const fontSize = parseFloat(styles.fontSize) * scale;
      context.font = `${styles.fontStyle} ${styles.fontWeight} ${fontSize}px ${styles.fontFamily}`;
      const actual = context.measureText(text);
      const left = Math.max(0, (width - actual.width) / 2);
      const baseline = (height - (actual.actualBoundingBoxAscent + actual.actualBoundingBoxDescent)) / 2
        + actual.actualBoundingBoxAscent;
      bounds = [];
      let prefix = '';
      for (const character of text) {
        const start = prefix;
        prefix += character;
        if (character.trim()) {
          const before = context.measureText(start).width;
          const after = context.measureText(prefix).width;
          const glyph = context.measureText(character);
          bounds.push({
            character,
            x: left + before,
            y: baseline,
            left: left + before - glyph.actualBoundingBoxLeft,
            top: baseline - glyph.actualBoundingBoxAscent,
            right: left + before + glyph.actualBoundingBoxRight,
            bottom: baseline + glyph.actualBoundingBoxDescent
          });
        }
      }
      return { font: context.font, text, left, baseline };
    }

    function resize() {
      const rect = line.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      paint(performance.now());
    }

    function paint(now) {
      frame = 0;
      if (document.hidden || reducedMotion.matches) return;
      const delta = Math.min(0.05, Math.max(0.001, (now - (lastTime || now)) / 1000));
      lastTime = now;
      clock += delta;
      const layout = prepareGlyphs();
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const sweepX = width * (0.5 - 0.5 * Math.cos(clock * 0.42));
      const focusX = pointerActive ? pointerX : sweepX;
      const focusY = pointerActive ? pointerY : height * (0.47 + 0.07 * Math.sin(clock * 0.7));
      const glyph = bounds.reduce((best, item) => {
        const distance = focusX < item.left ? item.left - focusX : focusX > item.right ? focusX - item.right : 0;
        return !best || distance < best.distance ? { item, distance } : best;
      }, null)?.item;

      if (glyph) {
        const padding = 5;
        const left = Math.round(glyph.left - padding) + 0.5;
        const top = Math.round(glyph.top - padding) + 0.5;
        const right = Math.round(glyph.right + padding) + 0.5;
        const bottom = Math.round(glyph.bottom + padding) + 0.5;
        context.save();
        context.setLineDash([4, 3]);
        context.lineWidth = 1;
        context.strokeStyle = 'rgba(214,183,123,.78)';
        context.strokeRect(left, top, right - left, bottom - top);
        context.setLineDash([]);
        context.fillStyle = brass;
        for (const [x, y] of [[left, top], [right, top], [right, bottom], [left, bottom]]) {
          context.fillRect(Math.round(x - 2), Math.round(y - 2), 4, 4);
        }
        context.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        context.fillStyle = 'rgba(214,183,123,.82)';
        context.fillText(`${glyph.character}  ${Math.round(glyph.right - glyph.left)} × ${Math.round(glyph.bottom - glyph.top)}`, left, Math.max(10, top - 6));
        for (let index = 0; index < 5; index += 1) {
          const seed = Math.sin(clock * 4 + index * 17 + glyph.x * 0.1);
          const x = left + Math.abs(seed) * (right - left);
          const y = top + Math.abs(Math.cos(clock * 3 + index * 9)) * (bottom - top);
          const size = index % 3 === 0 ? 3 : 2;
          context.globalAlpha = 0.35 + Math.abs(seed) * 0.55;
          context.fillRect(Math.round(x), Math.round(y), size, size);
        }
        context.restore();
      }
      // A small technical sweep line is the signature animated reveal on the name.
      const sweep = context.createLinearGradient(focusX - 34, 0, focusX + 34, 0);
      sweep.addColorStop(0, 'rgba(214,183,123,0)');
      sweep.addColorStop(0.5, 'rgba(214,183,123,.22)');
      sweep.addColorStop(1, 'rgba(214,183,123,0)');
      context.fillStyle = sweep;
      context.fillRect(Math.max(0, focusX - 34), 0, 68, height);
      frame = window.requestAnimationFrame(paint);
    }

    line.addEventListener('pointermove', event => {
      const rect = line.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      pointerActive = true;
    }, { passive: true });
    line.addEventListener('pointerleave', () => { pointerActive = false; }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(line);
    else window.addEventListener('resize', resize, { passive: true });
    document.fonts?.ready.then(resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) window.cancelAnimationFrame(frame);
      else { lastTime = 0; frame = window.requestAnimationFrame(paint); }
    });
    reducedMotion.addEventListener?.('change', event => {
      if (event.matches) {
        window.cancelAnimationFrame(frame);
        context.clearRect(0, 0, canvas.width, canvas.height);
      } else {
        frame = window.requestAnimationFrame(paint);
      }
    });
    resize();
  }

  startTechName(document.querySelector('.hero-name-line.first'));
  startTechName(document.querySelector('.hero-name-line.last'));

  // ---------------------------------------------------------------------------
  // Ordered-dither animated waves (standalone WebGL; no libraries or assets).
  // ---------------------------------------------------------------------------
  const waveCanvas = document.createElement('canvas');
  waveCanvas.className = 'ambient-canvas';
  waveCanvas.setAttribute('aria-hidden', 'true');
  const waveRoot = document.querySelector('#dither-root');
  const gl = waveCanvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'low-power', preserveDrawingBuffer: false
  });

  if (waveRoot && gl && !reducedMotion.matches) {
    waveRoot.append(waveCanvas);
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
      const vec3 waveColor = vec3(0.43, 0.34, 0.20);
      const vec3 backgroundColor = vec3(0.047, 0.043, 0.035);

      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

      float cnoise(vec2 P) {
        vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
        vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
        Pi = mod289(Pi);
        vec4 ix = Pi.xzxz;
        vec4 iy = Pi.yyww;
        vec4 fx = Pf.xzxz;
        vec4 fy = Pf.yyww;
        vec4 i = permute(permute(ix) + iy);
        vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
        vec4 gy = abs(gx) - 0.5;
        vec4 tx = floor(gx + 0.5);
        gx = gx - tx;
        vec2 g00 = vec2(gx.x, gy.x);
        vec2 g10 = vec2(gx.y, gy.y);
        vec2 g01 = vec2(gx.z, gy.z);
        vec2 g11 = vec2(gx.w, gy.w);
        vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
        g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
        float n00 = dot(g00, vec2(fx.x, fy.x));
        float n10 = dot(g10, vec2(fx.y, fy.y));
        float n01 = dot(g01, vec2(fx.z, fy.z));
        float n11 = dot(g11, vec2(fx.w, fy.w));
        vec2 fadeXY = fade(Pf.xy);
        vec2 nx = mix(vec2(n00, n01), vec2(n10, n11), fadeXY.x);
        return 2.3 * mix(nx.x, nx.y, fadeXY.y);
      }

      float fbm(vec2 point) {
        float value = 0.0;
        float amplitude = 1.0;
        float frequency = 2.65;
        for (int octave = 0; octave < 4; octave++) {
          value += amplitude * abs(cnoise(point));
          point *= frequency;
          amplitude *= 0.32;
        }
        return value;
      }

      float pattern(vec2 point) {
        vec2 drift = point - time * 0.045;
        return fbm(point + fbm(drift));
      }

      float bayerThreshold(vec2 cell) {
        int x = int(mod(cell.x, 8.0));
        int y = int(mod(cell.y, 8.0));
        int rank = 0;
        float value = 0.0;
        for (int bit = 0; bit < 3; bit++) {
          float divisor = pow(2.0, float(bit));
          float xb = mod(floor(float(x) / divisor), 2.0);
          float yb = mod(floor(float(y) / divisor), 2.0);
          float cell = xb < 0.5 ? (yb < 0.5 ? 0.0 : 2.0) : (yb < 0.5 ? 3.0 : 1.0);
          float weight = bit == 0 ? 16.0 : (bit == 1 ? 4.0 : 1.0);
          value += cell * weight;
        }
        return value / 64.0 - 0.25;
      }

      vec3 orderedDither(vec2 coord, vec3 color) {
        vec2 cell = floor(coord / 2.4);
        color += bayerThreshold(cell) / 4.0;
        float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
        float bias = mix(0.2, 0.0, smoothstep(0.45, 0.8, luminance));
        color = clamp(color - bias, 0.0, 1.0);
        return floor(color * 4.0 + 0.5) / 4.0;
      }

      void main() {
        vec2 point = gl_FragCoord.xy / resolution - 0.5;
        point.x *= resolution.x / resolution.y;
        float field = pattern(point);
        if (mouseActive > 0.5) {
          vec2 mouse = (mousePosition / resolution - 0.5) * vec2(1.0, -1.0);
          mouse.x *= resolution.x / resolution.y;
          float distanceToMouse = length(point - mouse);
          float influence = 1.0 - smoothstep(0.0, 0.42, distanceToMouse);
          field -= 0.5 * influence;
        }
        vec3 color = mix(backgroundColor, waveColor, clamp(field, 0.0, 1.0));
        gl_FragColor = vec4(orderedDither(gl_FragCoord.xy, color), 1.0);
      }
    `;

    function makeShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('Dither shader could not compile:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = makeShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = makeShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (vertexShader && fragmentShader) {
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.useProgram(program);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

        const resolution = gl.getUniformLocation(program, 'resolution');
        const timeUniform = gl.getUniformLocation(program, 'time');
        const mousePosition = gl.getUniformLocation(program, 'mousePosition');
        const mouseActive = gl.getUniformLocation(program, 'mouseActive');
        let pointerX = 0;
        let pointerY = 0;
        let pointerSeen = false;
        let animationFrame = 0;
        let visible = !document.hidden;
        const started = performance.now();

        function resize() {
          const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
          const width = Math.max(1, Math.round(window.innerWidth * ratio));
          const height = Math.max(1, Math.round(window.innerHeight * ratio));
          if (waveCanvas.width !== width || waveCanvas.height !== height) {
            waveCanvas.width = width;
            waveCanvas.height = height;
          }
          gl.viewport(0, 0, width, height);
          gl.uniform2f(resolution, width, height);
          draw();
        }

        function draw() {
          animationFrame = 0;
          if (!visible || reducedMotion.matches) return;
          const width = waveCanvas.width;
          const height = waveCanvas.height;
          const ratio = width / Math.max(1, window.innerWidth);
          gl.uniform1f(timeUniform, (performance.now() - started) / 1000);
          gl.uniform2f(mousePosition, pointerX * ratio, height - pointerY * ratio);
          gl.uniform1f(mouseActive, pointerSeen ? 1 : 0);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          animationFrame = window.requestAnimationFrame(draw);
        }

        window.addEventListener('pointermove', event => {
          pointerX = event.clientX;
          pointerY = event.clientY;
          pointerSeen = true;
        }, { passive: true });
        window.addEventListener('pointerleave', () => { pointerSeen = false; }, { passive: true });
        window.addEventListener('resize', resize, { passive: true });
        document.addEventListener('visibilitychange', () => {
          visible = !document.hidden;
          if (visible && !animationFrame) animationFrame = window.requestAnimationFrame(draw);
          else if (!visible) window.cancelAnimationFrame(animationFrame);
        });
        reducedMotion.addEventListener?.('change', event => {
          if (event.matches) {
            window.cancelAnimationFrame(animationFrame);
            waveRoot.hidden = true;
          } else {
            waveRoot.hidden = false;
            animationFrame = window.requestAnimationFrame(draw);
          }
        });
        waveCanvas.addEventListener('webglcontextlost', event => {
          event.preventDefault();
          window.cancelAnimationFrame(animationFrame);
          waveRoot.hidden = true;
        });
        resize();
      } else {
        console.warn('Dither shader could not link:', gl.getProgramInfoLog(program));
      }
    }
  }
})();
