# Temple Darshan Booking — Frontend

A React + TypeScript frontend for booking temple darshan time slots: browse slot
availability, reserve a slot, and manage existing bookings.

> **Status:** initial project setup only. None of the five assessment problems
> (P1–P5) have been implemented yet. The app currently renders a landing page
> and a single smoke test.

---

## Assessment purpose

This repository is a frontend coding assessment. The work is delivered as five
independent problems (P1–P5), each built on its own feature branch and merged
into `main` through a pull request.

### Technology stack

| Concern          | Choice                                              |
| ---------------- | --------------------------------------------------- |
| Framework        | React 19                                             |
| Language         | TypeScript (strict mode)                             |
| Build tool       | Vite 8                                               |
| Styling          | Tailwind CSS v4 (via `@tailwindcss/vite`)            |
| Testing          | Vitest + React Testing Library + `@testing-library/jest-dom` |
| Test environment | jsdom                                                |
| Coverage         | `@vitest/coverage-v8`                                |
| Linting          | ESLint (flat config) + `typescript-eslint` (type-aware) + React Hooks / React Refresh plugins |
| Package manager  | npm                                                  |

---

## Planned features (P1–P5)

| ID | Feature | Scope |
| -- | ------- | ----- |
| **P1** | Slot list and booking form | Render available darshan slots and a form to book one, with validation. |
| **P2** | Shareable filters and URL state | Filter the slot list and reflect the filter state in the URL so a view can be shared and restored. |
| **P3** | Safe booking submission and retry handling | Prevent duplicate submissions and handle transient failures with a safe retry path. |
| **P4** | My bookings and cancellation | List the current user's bookings and allow cancelling one. |
| **P5** | Accessibility and Malayalam localization | Keyboard and screen-reader support, plus a Malayalam (ml) locale alongside English. |

None of the above are implemented yet.

---

## Prerequisites

- **Node.js** 20.19+ or 22.12+ (developed on Node 24) — <https://nodejs.org>
- **npm** 10+ (ships with Node)
- **Git** — <https://git-scm.com>

Check your versions:

```bash
node --version
npm --version
git --version
```

---

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/S-Krishna-Priya/tdb-booking-frontend.git
cd tdb-booking-frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the development server

```bash
npm run dev
```

Vite prints a local URL (by default <http://localhost:5173>). Open it in a browser.

---

## Available scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Start the Vite dev server with hot module replacement. |
| `npm run build` | Type-check with `tsc -b`, then produce a production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Run ESLint across the project. |
| `npm run test` | Run the test suite once (Vitest). |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:coverage` | Run the tests and generate a coverage report (`coverage/`). |

Run the full check before opening a pull request:

```bash
npm run lint
npm run test
npm run build
```

---

## Project structure

```
tdb-booking-frontend/
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md   # PR template applied to every pull request
├── public/
│   └── favicon.svg
├── src/
│   ├── api/                       # Mock API client (added in P1+)
│   ├── components/                # Shared presentational components
│   ├── features/                  # Feature modules, one per problem area
│   ├── hooks/                     # Reusable React hooks
│   ├── types/                     # Shared TypeScript types
│   ├── utils/                     # Pure helpers
│   ├── test/
│   │   └── setup.ts               # Vitest setup (jest-dom matchers)
│   ├── App.tsx                    # Landing page
│   ├── App.test.tsx               # Smoke test for the landing page
│   ├── main.tsx                   # React entry point
│   └── index.css                  # Tailwind entry point
├── eslint.config.js               # ESLint flat config
├── index.html
├── package.json
├── tsconfig.json                  # Project references
├── tsconfig.app.json              # App config (strict mode)
├── tsconfig.node.json             # Config-file config
└── vite.config.ts                 # Vite + Tailwind plugins and Vitest config
```

The `api/`, `components/`, `features/`, `hooks/`, `types/` and `utils/`
directories are currently empty — they are filled in as the problems are
implemented.

---

## Mock API

This application uses a **mock API** and does **not** require a real backend.
Slot and booking data are served from an in-app mock layer (to be added under
`src/api/` in P1), so the app runs entirely from `npm run dev` with no server,
database, or credentials.

No environment variables are required for local development.

---

## Git workflow

`main` is the default branch and holds the reviewed, working state of the
project. **Assessment feature work is never committed directly to `main`.**

Each problem is delivered as follows:

1. Branch off an up-to-date `main`:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/p1-slot-list-and-booking-form
   ```

2. Implement the problem, with tests, committing in meaningful steps.

3. Verify locally:

   ```bash
   npm run lint && npm run test && npm run build
   ```

4. Push the branch and open a pull request into `main`:

   ```bash
   git push -u origin feat/p1-slot-list-and-booking-form
   ```

5. Fill in the pull request template (see below), then merge into `main` once
   the PR is reviewed.

Suggested branch names:

| Problem | Branch |
| ------- | ------ |
| P1 | `feat/p1-slot-list-and-booking-form` |
| P2 | `feat/p2-shareable-filters-url-state` |
| P3 | `feat/p3-safe-submission-retry` |
| P4 | `feat/p4-my-bookings-cancellation` |
| P5 | `feat/p5-accessibility-malayalam-localization` |

---

## Pull request template

Every pull request uses the template in
[`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md), which
has these sections:

```markdown
## Problem

Which assessment problem this PR addresses (P1–P5), what it changes and why.

## Assumptions

Requirements that were ambiguous, and the interpretation chosen.

## Decisions & trade-offs

Approaches considered, what was chosen, and what was given up.

## How to test

Steps a reviewer can follow to verify this change.
```

---

## Progress

- [ ] **P1** — Slot list and booking form
- [ ] **P2** — Shareable filters and URL state
- [ ] **P3** — Safe booking submission and retry handling
- [ ] **P4** — My bookings and cancellation
- [ ] **P5** — Accessibility and Malayalam localization

---

## Assessment pull requests

Links are added here as each problem is submitted.

| Problem | Pull request | Status |
| ------- | ------------ | ------ |
| P1 — Slot list and booking form | _not submitted yet_ | Not started |
| P2 — Shareable filters and URL state | _not submitted yet_ | Not started |
| P3 — Safe booking submission and retry handling | _not submitted yet_ | Not started |
| P4 — My bookings and cancellation | _not submitted yet_ | Not started |
| P5 — Accessibility and Malayalam localization | _not submitted yet_ | Not started |
