# WorkWindow (V1)

Local-first planning app that combines a Kanban board with a month calendar using day blocks (points per day, not hourly slots).

## Setup / Run

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Data model

State is stored in localStorage with key `workwindow:data:v1`.

```js
{
  version: 1,
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
      completed_points
    }
  ]
}
```

Rules:
- `total_planned_points = sum(planned_day_blocks.points)`
- `completion = completed_points / estimate_points`
- if `completed_points >= estimate_points`, card auto moves to `Done`
- dependencies are warning-only (not scheduling blockers)
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
- Dependency warning badge on cards
- localStorage persistence with schema normalization
- Export JSON / Import JSON

## Known limitations

- No automated test suite yet (manual verification only)
- Uses basic HTML5 drag/drop (no advanced touch DnD handling)
- No filtering/search/sorting for large boards
- Calendar is month-only in v1
- No conflict detection between due date and remaining work

## V2 backlog

- Better dependency visuals and critical path hints
- Velocity trends and burnup/burndown views
- Recurring planning templates
- Calendar filters by status/tag
- Better mobile drag/drop UX
- Optional daily capacity targets
