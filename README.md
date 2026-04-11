# WorkWindow (V1)

Local-first planning app that combines a Kanban board with a month calendar using day blocks (points per day, not hourly slots).

## Secure Remote Access

This app can be deployed securely so the same private workspace is available from your iPhone and desktop.

Architecture:

- Vercel hosts the Vite frontend
- Supabase Auth handles sign-in with a magic link
- Supabase Postgres stores one JSON state document per user
- Row Level Security ensures each authenticated user can only read and write their own row

Security rules for this repo:

- Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in local or hosted env vars
- Never commit `.env` files
- Never use a Supabase service role key in the frontend
- Apply the SQL in [docs/supabase.sql](./docs/supabase.sql) before using cloud sync

Setup:

1. Create a Supabase project.
2. Enable Email OTP / Magic Link auth in Supabase.
3. Run the SQL in [docs/supabase.sql](./docs/supabase.sql).
4. Copy [.env.example](./.env.example) to `.env.local` and fill in your Supabase URL and publishable key.
5. Add the same env vars in Vercel for production.
6. In Supabase Auth settings, add your Vercel URL and local dev URL as redirect URLs.
7. Deploy with Vercel using [vercel.json](./vercel.json) so the security headers are applied in production.

## Setup / Run

```bash
npm install
npm run dev
```

Developer workflow (hooks + CI): see [CONTRIBUTING.md](./CONTRIBUTING.md).
CI/CD operations (quality gates + production deploy): see [CONTRIBUTING.md](./CONTRIBUTING.md).
Current CD mode is private-safe artifact promotion + release packaging until public hosting is enabled.

Build for production:

```bash
npm run build
npm run preview
```

## Data model

State is cached in localStorage with key `workwindow:data:v2` and synced to the authenticated user's Supabase row.

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
      status, // Backlog | In Progress | Blocked | Done
      estimate_points,
      due_date, // YYYY-MM-DD | null
      dependencies: [cardId],
      planned_day_blocks: [
        { id, date: "YYYY-MM-DD", points: 1 }
      ],
      completed_points,
      progress_log: [
        { id, date: "YYYY-MM-DD", delta: 1 }
      ]
    }
  ]
}
```

Rules:

- `total_planned_points = sum(planned_day_blocks.points)`
- `completion = completed_points / estimate_points`
- if `completed_points >= estimate_points`, card auto moves to `Done`
- dependencies are warning-only (not scheduling blockers)
- progress updates are tracked in `progress_log` for velocity metrics
- import replaces all app data

## Implemented V1 features

- Kanban board with 4 columns: Backlog, In Progress, Blocked, Done
- Board search, status filters, and sorting (created order, due date, progress)
- Create, edit, delete cards
- Drag card between columns (status update)
- Month calendar grid with day chips for planned blocks
- Calendar status filters for visible planned day blocks
- Drag card from board to day cell to create a 1-point block
- Edit/delete day block chips (points 1-8)
- Selected-day agenda strip with block editing
- Card progress controls (`+1` / `-1` completed points)
- Due-date risk warnings (overdue or planned-point shortfall) on cards and agenda
- Dependency warning badges with chain/cycle highlights on cards
- Dependency graph panel with blocker/dependent chain visibility
- “Blocked by” section in card modal for unresolved dependencies
- Performance panel with burnup, plan coverage, weekly velocity, and 7-day forecast
- Schema v1 -> v2 migration scaffolding and stricter import validation
- localStorage persistence with schema normalization
- Export JSON / Import JSON

## Known limitations

- Automated tests cover core flows but are not exhaustive yet
- Uses basic HTML5 drag/drop (no advanced touch DnD handling)
- Calendar is month-only in v1
- No automatic scheduling suggestions when risk is detected
- iPhone access now has button-based fallbacks for planning and status changes, but desktop drag/drop is still the richer workflow

## V2 backlog

- Better dependency visuals and critical path hints
- Velocity trends and burnup/burndown views
- Recurring planning templates
- Calendar filters by status/tag
- Better mobile drag/drop UX
- Optional daily capacity targets
