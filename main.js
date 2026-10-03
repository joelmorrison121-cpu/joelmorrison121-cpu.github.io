(() => {
  const year = document.querySelector('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  const menu = document.querySelector('.mobile-nav');
  if (menu) {
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => { menu.open = false; });
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
    document.addEventListener('pointerdown', event => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
  }

  const folder = document.querySelector('#project-folder');
  folder?.querySelectorAll('.folder-contents a').forEach(link => {
    link.addEventListener('click', () => { folder.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && folder?.open) {
      folder.open = false;
      folder.querySelector('summary').focus();
    }
  });

  const sectionLinks = [...document.querySelectorAll('nav a[href^="#"]')];
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      sectionLinks.forEach(link => {
        if (link.getAttribute('href') === `#${visible.target.id}`) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-20% 0px -50% 0px', threshold: [0, .2, .5] });
    document.querySelectorAll('main section[id]').forEach(section => sectionObserver.observe(section));
  }

  const canvas = document.querySelector('#ambient-canvas');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!canvas || reducedMotion.matches) return;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return;

  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  let frameId = 0;
  let lastFrame = 0;
  let image;
  let running = true;

  function resize() {
    const scale = Math.min(1, 240 / Math.max(window.innerWidth, window.innerHeight));
    const width = Math.max(1, Math.round(window.innerWidth * scale));
    const height = Math.max(1, Math.round(window.innerHeight * scale));
    if (width === canvas.width && height === canvas.height) return;
    canvas.width = width;
    canvas.height = height;
    image = context.createImageData(width, height);
  }

  function draw(now) {
    if (!running) return;
    frameId = requestAnimationFrame(draw);
    if (now - lastFrame < 100) return; // at most 10 frames per second
    lastFrame = now;
    resize();
    const { width, height } = canvas;
    const data = image.data;
    const time = now * .00013;
    const xWave = new Float32Array(width);
    const yWave = new Float32Array(height);
    for (let x = 0; x < width; x++) xWave[x] = Math.sin(x * .037 + time) * .4 + Math.sin(x * .085 - time * .45) * .22;
    for (let y = 0; y < height; y++) yWave[y] = Math.sin(y * .064 - time * .8) * .38;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const wave = xWave[x] + yWave[y];
        const threshold = bayer[(y & 3) * 4 + (x & 3)] / 16;
        const shade = wave > threshold * .75 - .34 ? 1 : 0;
        const index = (y * width + x) * 4;
        data[index] = shade ? 92 : 16;
        data[index + 1] = shade ? 74 : 15;
        data[index + 2] = shade ? 46 : 12;
        data[index + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(frameId);
  }
  function resume() {
    if (running || document.hidden || reducedMotion.matches) return;
    running = true;
    frameId = requestAnimationFrame(draw);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause(); else resume();
  });
  reducedMotion.addEventListener('change', event => {
    canvas.hidden = event.matches;
    if (event.matches) pause(); else resume();
  });
  frameId = requestAnimationFrame(draw);
})();
