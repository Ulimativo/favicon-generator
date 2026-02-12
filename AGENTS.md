# Repository Guidelines

## Project Structure

- `src/` – static site source:
  - `src/index.html` – main page
  - `src/css/styles.css` – styles
  - `src/js/script.js` – client-side logic (favicon generation + downloads)
  - `src/assets/icons/` – bundled icons/screenshots
- Root files like `robots.txt`, `sitemap.xml`, `site.webmanifest` are deployment/static-hosting assets.
- Container build artifacts are defined in `docker/Dockerfile` and served by Nginx.

## Build, Test, and Development Commands

This repo is a static HTML/CSS/JS app (no local build step).

- Recommended local run (matches production): `docker compose up --build` then open `http://localhost:8080`
- No-Docker run: `python3 -m http.server --directory src 8000` then open `http://localhost:8000`
- Compose config: `docker-compose.yml` exposes the app on `http://localhost:8080`.

Note: The Docker image serves the `src/` directory via Nginx (see `docker/Dockerfile` and `nginx.conf`). Keep asset paths relative to `src/`.

## Coding Style & Naming Conventions

- Indentation: 4 spaces in HTML/CSS/JS (match existing files in `src/`).
- JavaScript: prefer `const`/`let`, single quotes, and trailing semicolons.
- Naming:
  - DOM elements: `camelCase` (e.g., `previewContainer`)
  - CSS classes: `kebab-case` (e.g., `drop-zone`, `preview-item`)

## Testing Guidelines

No automated test suite is configured.

- Manual smoke test: load the page, upload an image, click **Generate Favicons**, download a single size and **Download All**, and verify files open correctly.
- Manual smoke test: load the page, upload an image, toggle **Fit/Fill**, then verify per-tile **Download PNG**, **Download PNGs (.zip)**, and **Download Package** outputs.
- If you add new static assets needed at runtime, update `docker/Dockerfile` to copy them into the image.

## Commit & Pull Request Guidelines

- Commits: keep messages short and descriptive (history uses simple subjects like “Update README.md” / “final touches”).
- PRs: include a clear description, steps to verify, and screenshots for UI changes. Link related issues when applicable.
