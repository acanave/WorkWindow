# WorkWindow

WorkWindow helps you make time for the work behind a deadline.

For example, a volunteer schedule is due Friday and takes an hour to draft. Give it a **work window** from Tuesday through Friday and estimate one hour of effort. When you decide to do the work on Wednesday from 2 to 3 p.m., book that **time block** on the calendar. The Friday deadline stays in place.

[Open WorkWindow](https://workwindow.vercel.app) · The hosted workspace requires an approved account. Run locally to explore an empty workspace without signing in.

![WorkWindow redesigned dashboard with fictional example data](docs/screenshots/dashboard-overview.png)

## One workspace, four views

| View      | Purpose                                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| Dashboard | Capture thoughts, choose today’s tasks, see booked time, and complete or defer work.                                        |
| Calendar  | See month/week plans, drag across dates to create a WorkWindow, and book specific time blocks.                              |
| Boards    | Follow Backlog → Ready → In progress → Done with stacked project piles, shared project colors, and expandable task details. |
| Projects  | Review the timetable, next action, progress, blockers, tasks, and saved project notes.                                      |

![WorkWindow redesigned boards with fictional example data](docs/screenshots/board-overview.png)

Screenshots use fictional example projects and tasks. New workspaces contain no sample tasks or projects.

## Optional Telegram assistant

The hosted deployment includes an owner-only OpenClaw assistant for one authorized project. You can use all four WorkWindow views independently of Telegram.

### Plan the next two hours

> “I’m free from 1 to 3 this afternoon. What should I tackle first, and why? Draft time blocks around my project bookings.”

The assistant reviews open tasks, deadlines, blockers, dependencies, and visible bookings for that project. It can suggest a first step and draft a schedule in chat. For example, if an outline is holding up a draft and there’s a project check-in at 1:30, it can suggest starting the outline before the check-in and continuing afterward. You choose which blocks to book in WorkWindow. Conflict checks cover only bookings returned for the selected project.

### Propose a task change

> “Add a task to draft the volunteer schedule.”

The assistant sends a review link. Sign in to WorkWindow to see the project and the exact change. Choose **Approve exact changes** to create the Backlog task, or **Cancel proposal** to leave the task unchanged. You can also request title or description edits to a supported unfinished task.

Proposals expire after ten minutes. If the workspace revision changes first, the assistant needs to prepare a fresh proposal. Approval saves the task change and its receipt together, so retrying the same approval applies the change once.

See the [assistant integration guide](candidates/task-approval/README.md) for setup details, project limits, and verification.

## Run locally

Requires Node.js 24.x and npm.

```bash
npm ci
npm run dev
```

Without Supabase environment variables, the dashboard opens directly and saves to this browser. There is no mode chooser. Local data does not automatically sync or migrate into a cloud account.

For an authenticated deployment, follow [Cloud setup](docs/cloud-setup.md). The hosted app uses Supabase email magic links and stores owner-scoped workspaces in Postgres.

## Saving and privacy

- Local evaluation uses browser storage. Configured cloud deployments also keep a device cache, including unsynced edits.
- Cloud saves are serialized and checked against a revision number. A conflicting edit pauses saving instead of overwriting newer work; export the local draft before loading the saved workspace.
- Other sessions refresh from the cloud periodically and on window focus when no edits are pending.
- Export backup downloads workspace JSON. Treat exports as private; there is currently no redesigned import/restore interface.
- Upgraded legacy cards retain their original records. Legacy effort points are preserved as context, not converted to hours.

See [Privacy](PRIVACY.md) and [Security](SECURITY.md). Never put passwords, tokens, private exports, or server-side keys in this public repository. Values exposed through `VITE_*` are visible in the browser. Use the Supabase URL and publishable key for client access. Keep assistant credentials server-side.

## Architecture

React/Vite provides the application shell and authentication. `src/redesign/Workspace.jsx` mounts the approved interface, `controller.js` handles view interactions, `model.js` validates and migrates workspaces, and `cloud.js` handles revision-checked persistence. The UI shares one workspace across all four tabs.

Older components in `src/components` and the reducer under `src/state` remain for legacy coverage and reference; they are not the redesigned UI entry point. This is an incremental migration, not a complete rewrite of every source module.

## Checks and contribution

```bash
npm run lint
npm run format:check
npm test
npm run build
npm run screenshots:install
npm run test:e2e
```

To regenerate the fictional README screenshots: `npm run screenshots:capture`.

CI runs formatting, lint, unit tests, build, browser/accessibility checks, and a full-history Gitleaks scan. See [Contributing](CONTRIBUTING.md) and [release notes](docs/REDESIGNED-RELEASE.md).

## Current scope

- Desktop browser use is primary; narrow layouts support basic phone review.
- Sticky notes and reminders live inside the app. Native floating notes and background push notifications are not implemented.
- No guaranteed offline capture/sync, installable-app support, automatic scheduling, or collaborative real-time editing.
- Light and dark appearances are tested. Automated accessibility checks complement, rather than replace, manual testing.
- Legacy insights, point-based planning, and import controls are not part of the redesigned interface.
