# AGENTIS GENESIS — Build State

> Single source of truth for the current build/runtime state of the AGENTIS
> GENESIS Next.js dashboard. Updated in place as the project evolves.

## Tech stack

| Layer | Package | Version |
|---|---|---|
| Framework | Next.js | 15.1.6 (App Router) |
| Runtime | React | 19.0.0 |
| Styling | Tailwind CSS | 3.x |
| State | Zustand | 5.0.15 |
| Animation | framer-motion | 11.18.2 |
| Build | TypeScript | `tsc --noEmit` clean |

## Configuration

- `next.config.js`: `reactStrictMode: true` (kept enabled — not disabled).
- Tailwind config present; custom CSS vars in `src/app/globals.css`, effects in `src/styles/effects.css`.

## Layer status

- [x] **Foundation** — design-system primitives, Zustand store, mock data/API, navigation.
- [x] **App shell** — `AppShell` with sidebar, top status bar, command bar, error boundary.
- [x] **Runtime stabilized** — all SSR/StrictMode runtime errors resolved (see below).
- [x] **Landing hero** — full-viewport hero with the exact `AGENTIS HERO.png` image,
  HTML typography/HUD/CTA layered above the image. `/` routes to Hero;
  `ENTER GENESIS` transitions to the Dashboard.
- [ ] **Work tree introduction / agent system / command center polish** — next milestone.

## Runtime errors resolved

### 1. `getServerSnapshot should be cached to avoid an infinite loop`
- **Root cause:** Zustand (`create()` singleton) selectors like
  `useStore((s) => Object.values(s.workTrees))` returned a **new array reference** on every
  call. React 19 StrictMode double-invokes SSR render, so `useSyncExternalStore` saw an
  unstable `getServerSnapshot` and threw.
- **Fix:** Added denormalized, atomic list fields to the store
  (`workTreeList`, `agentList`, `taskList`, `workTreeNodeList`), refreshed in
  `loadWorkTrees` / `loadWorkTree` / `updateAgentStatus` / `updateTaskStatus` /
  `toggleNodeCollapse`. Hooks (`useAppData`, `useAppAgents`, `useTasks`) and components
  now select stable references. (`src/state/store.ts`)

### 2. SSR hydration mismatch (`Good morning` vs `Good evening`)
- **Root cause:** `new Date().getHours()` in `GreetingSection` (and `now = new Date()` in
  `TaskCard.timeAgo`) render differently on the server (UTC) vs the browser (local time).
  All `toLocaleDateString`/`toLocaleString` calls also varied by locale/TZ.
- **Fix:**
  - Current-time values deferred client-side via a `useMounted` guard
    (`src/hooks/useMounted.ts`).
  - Date formatting centralized in `src/lib/date.ts` (`formatDate`, `formatDateTime`)
    using an explicit `timeZone: "UTC"` + `"en-US"` for deterministic output.
  - Affected components updated: `Dashboard.tsx`, `TaskCard.tsx`,
    `WorkTreeHeader.tsx`, `MemoryItem.tsx`, `ArtifactCard.tsx`, `MemoryView.tsx`,
    `WorkTreePage.tsx`.

### 3. StrictMode + motion
- framer-motion content (`AnimatePresence`/`motion`) gated behind `useMounted` so it never
  renders during SSR/StrictMode initial double-invoke. (`CommandCenter.tsx`, `AgentActivity.tsx`)

## Routes

Prerendered (static) / dynamic (SSR):
- `/` — landing hero → Dashboard (client-routed toggle)
- `/_not-found`
- `/agents`
- `/memory`
- `/settings`
- `/work`
- `/work/[id]` (dynamic)

## Commands

```bash
npm run dev        # http://localhost:3000 (dev server, StrictMode ON)
npm run build      # production build (8 routes prerendered)
npx tsc --noEmit   # type check
```

## Assets

- Hero image: `public/agentis-hero.png` (1672×941, served at `/agentis-hero.png`).

## Git state

- Branch: `main` (origin: `origin/main`).
- Working tree: **clean**; everything committed & pushed.
- Latest commits (newest first):
  1. `019dc3d` Remove redundant root image; serve from `public/`
  2. `3637d88` Merge remote image-upload commit (`e333ec9`)
  3. `e38d6bd` Use exact AGENTIS HERO image as landing visual
  4. `3a47234` Add landing hero: evolution timeline + Enter Genesis
  5. `d1cd247` Fix SSR hydration mismatches (defer time, deterministic dates)
  6. `d48443f` Stable Zustand selectors + mounted guards (StrictMode fix)
  7. `9b5122b` Initial commit

## Running

Dev server is live on `http://localhost:3000`:
- `/` renders the hero; clicking **ENTER GENESIS** mounts the Dashboard shell.
- All routes return HTTP 200; no Fast Refresh / hydration errors in logs.
