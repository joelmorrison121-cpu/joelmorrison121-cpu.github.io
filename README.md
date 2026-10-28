# Joel Morrison — portfolio

Live: **https://joelmorrison121-cpu.github.io/**

A plain static site: hand-written HTML, CSS and browser JavaScript, with no build step and no dependencies. Open `index.html` to run it locally. GitHub Pages serves the `main` branch from the root.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Homepage: hero, about, projects, skills, education, experience, contact |
| `crash-course.html` | Crash Course case study (`ai-racing.html` redirects here) |
| `styles.css` | Design tokens (`--bg`, `--ink`, `--brass`…), layout, responsive rules |
| `projects.css` | Case-study page styles |
| `main.js` | Menu, menu hover previews, click sparks, typed microcopy, ASCII background settings (`setupASCII()`) |
| `previews/` | The six cards shown when hovering the menu links (360×232, 2× WebP) |
| `gradient-ascii.js` | WebGL2 ASCII gradient background, with a static fallback |
| `og-image.png` | Preview image used when the URL is shared |
| `crash-course-source.zip` | Crash Course source, built from the [crash-course](https://github.com/joelmorrison121-cpu/crash-course) `v2.1` tag |

## Editing notes

- **Navigation:** the desktop nav, the no-JS mobile `<details>` menu and the staggered menu each list the sections. If you add a section, update all three.
- **Menu previews:** each menu link's `data-preview` points at its card in `previews/`. To change a card, replace the WebP at the same size (720×464). Previews only appear with a mouse and when there's room beside the menu.
- **Palette:** change it only through the CSS custom properties at the top of `styles.css`. The ASCII colours live in `setupASCII()` in `main.js`.
- **Motion:** the background pauses in hidden tabs and respects `prefers-reduced-motion`. Videos use `preload="none"`, so they don't download until played.
- **Crash Course ZIP:** to rebuild it after a new release, run this from the crash-course repo:
  `git archive --format=zip --prefix=crash-course/ -o crash-course-source.zip <tag> -- . ":!docs/*.gif" ":!docs/demo.mp4" ":!docs/results/*.png" ":!docs/*.png"`
- **CV:** `Joel-Morrison-CV.pdf` is the public copy, without a phone number.
