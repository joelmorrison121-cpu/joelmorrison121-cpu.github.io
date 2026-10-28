# Joel Morrison — Portfolio

My personal website, bringing together the projects I build, the experiments I run and what I learn along the way.

**[Visit the portfolio](https://joelmorrison121-cpu.github.io/)**

## Design

The visual direction combines warm sepia, muted gold and ivory with serif typography and an interactive ASCII background.

The aim is to give each project room to explain itself: what it does, my contribution, the decisions behind it and its current limitations.

## Built with

* HTML for structure and content.
* CSS for layout, typography and responsive styling.
* JavaScript and WebGL for interaction and visual effects.
* GitHub Pages for hosting.

The site includes project write-ups, demonstration videos, source links, education, experience and contact details.

## Run locally

Clone the repository:

```bash
git clone https://github.com/joelmorrison121-cpu/joelmorrison121-cpu.github.io.git
cd joelmorrison121-cpu.github.io
```

Serve the files with Python:

```bash
python -m http.server 8000
```

Open http://localhost:8000 in your browser.

## Updating the site

Edit the relevant HTML, CSS, JavaScript or media files, preview the changes locally, then commit and push them to the configured GitHub Pages publishing branch.

Project source code lives in its own repositories. This repository contains the website and the media used to present that work.

## Ongoing improvements

* Keep project descriptions and demonstrations current.
* Refine mobile layouts and keyboard navigation.
* Check readability, motion preferences and loading performance.
* Document new experiments and the lessons behind them.

## Contact

[LinkedIn](https://www.linkedin.com/in/joel-morrison-16a304389/) · [Email](mailto:joelmorrison121@gmail.com)


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
