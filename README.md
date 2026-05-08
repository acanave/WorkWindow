# WorkWindow

WorkWindow is the planner I wanted after bouncing between too many half-helpful tools. I kept running into the same problem: my to-do list knew what existed, my calendar knew when things were happening, and my Kanban board knew what was moving, but none of them talked to each other in a way that actually helped me get through real work.

So I built one workspace that combines all three. WorkWindow brings together a to-do list mindset, a calendar view, and a Kanban progress tracker so planning feels less like maintaining three separate systems and more like seeing the whole week clearly. It is designed to feel fast, focused, and a little opinionated in the best way: lightweight enough for everyday personal productivity, but structured enough to show dependencies, delivery risk, and momentum at a glance.

The calendar is meant to show both sides of a commitment: the anchor task or event, and the supporting work windows visually tied to it. Travel, preparation, focused execution, setup, and buffer all belong in that footprint, so the schedule shows what it actually takes to get work done.

Under the hood, it is also a local-first frontend engineering project with an optional upgrade path to authenticated cloud sync and multi-device access.

![WorkWindow launch modes](docs/screenshots/mode-chooser.svg)
![WorkWindow board overview](docs/screenshots/board-overview.svg)

## Why this repo exists

This project is meant to showcase:

- product thinking rooted in a real productivity pain point, not just CRUD forms
- a local-first architecture that remains useful without infrastructure
- a clean upgrade path to authenticated cloud sync with Supabase
- practical frontend engineering with state normalization, tests, and deploy-ready configuration

## Launch Paths

### Local-first quick start

Use this path if you want to evaluate the product immediately with no external services.

```bash
npm install
npm run dev
```

If no cloud env vars are present, the app opens with a mode chooser:

- `Local First` launches the full planner using browser storage only
- `Cloud Sync` shows the setup path for Supabase-backed auth and sync

### Cloud sync and hosted setup

Use this path if you want authenticated sync across devices or a hosted deployment.

1. Create a Supabase project.
2. Enable Email OTP / Magic Link authentication.
3. Run [docs/supabase.sql](./docs/supabase.sql) in the Supabase SQL editor.
4. Copy [.env.example](./.env.example) to `.env.local`.
5. Fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
6. Restart `npm run dev` or deploy the app with the same env vars.
7. If you deploy to Vercel, add your app URL to Supabase redirect settings.

Notes:

- `.env.example` contains placeholders only.
- `.env.local` is not committed.
- `.vercel` is ignored, so no live Vercel project linkage is committed.
- The frontend uses only the Supabase publishable key. Never place a service-role key in Vite env vars.

## Architecture

- `React + Vite` frontend with a local-first UX
- `localStorage` persistence for instant evaluation and offline-friendly use
- optional `Supabase Auth + Postgres` sync for authenticated multi-device access
- `RLS-backed user_states` row model for cloud sync
- `vercel.json` security headers for hosted deployments

## Product Highlights

- Kanban board with Backlog, In Progress, Blocked, and Done lanes
- Month calendar with due-date anchors and draggable work windows
- dependency warnings, chain visibility, and cycle badges
- due-date risk signals and shortfall indicators
- performance panel with burnup, plan coverage, and weekly velocity
- JSON import/export for portable local data
- touch-friendly fallback actions for planning and status changes

## Engineering Highlights

- normalized app state with schema migration scaffolding
- reusable reducer/store setup with import replacement support
- optional cloud bootstrap that hydrates local state from Supabase
- test coverage for state logic, calendar interactions, dependency views, and planning fallbacks
- public-safe config posture with no committed secrets or personal deployment linkage

## Quality Checks

```bash
npm run test
npm run build
npm run lint
```

Build preview:

```bash
npm run preview
```

## Data Model

State is stored locally with key `workwindow:data:v2`. When cloud sync is configured, that same normalized state is stored in the authenticated user's `user_states` row.

```js
{
  version: 2,
  ui: {
    selectedDate: "YYYY-MM-DD"
  },
  cards: [
    {
      id,
      title,
      description,
      status,
      estimate_points,
      due_date, // anchor date
      dependencies: [cardId],
      planned_day_blocks: [{ id, date: "YYYY-MM-DD", points: 1 }], // work windows
      completed_points,
      progress_log: [{ id, date: "YYYY-MM-DD", delta: 1 }]
    }
  ]
}
```

## Known Limitations

- tests cover core flows, but not every interaction edge case
- the calendar is month-only today
- mobile uses touch-friendly action fallbacks instead of advanced drag-and-drop
- there is no automatic scheduling suggestion engine yet

## Development Notes

Developer workflow and repository checks live in [CONTRIBUTING.md](./CONTRIBUTING.md).
