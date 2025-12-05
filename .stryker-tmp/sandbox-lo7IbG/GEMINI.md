# Repository Guidelines

## Project Structure & Module Organization
Fair Store is a Vite-powered Chrome extension built with Preact and TypeScript. Runtime code lives in `src/` (`popup.tsx` for UI logic, `popup.css` for styling) and mounts onto `popup.html`. Extension metadata and permissions stay in `manifest.json`. Browser-facing assets (icons, static pages) are stored under `icons/` and alongside the root HTML entry; Vite writes compiled output to `dist/` during builds. Keep new modules colocated with their entry points, and avoid adding stray files under the root to keep packaging predictable.

## Build, Test, and Development Commands
- `npm install` – install or refresh dependencies.
- `npm run dev` – start Vite in watch mode; the output in `dist/` updates automatically while you develop.
- `npm run build` – create a production bundle in `dist/` ready for packaging.
- `npm run preview` – serve the latest build for quick browser verification.

## Coding Style & Naming Conventions
Follow TypeScript strictness and prefer functional Preact components. Use PascalCase for component files (`WidgetPanel.tsx`), camelCase for variables and functions, and kebab-case for CSS selectors. Keep JSX indented with two spaces as in the existing `popup.tsx`. Import shared styles via relative paths, and favour co-locating component-specific assets within the same directory.

## Testing Guidelines
No automated suite is configured yet; add lightweight Vitest or Playwright coverage when contributing new logic. Until then, validate changes by loading the unpacked extension in Chrome and confirming UI flows under the `chrome://extensions/` page. When adding tests, place them under `tests/` or alongside the module with a `.test.ts(x)` suffix and document the run command in your pull request.

## Commit & Pull Request Guidelines
The history uses Conventional Commit prefixes (`feat:`, `chore:`); continue that format with imperative, scope-aware subjects. For pull requests, include a concise summary, screenshots or recordings for UI changes, reproduction steps for bugs, and link relevant GitHub issues. Ensure the build succeeds locally before requesting review, and call out manual verification steps in the description.

## Chrome Extension Workflow
After `npm run build`, load `dist/` as an unpacked extension for smoke testing. When preparing a release, zip the `dist/` folder, double-check manifest versioning, and update the Chrome Web Store listing notes if applicable.
