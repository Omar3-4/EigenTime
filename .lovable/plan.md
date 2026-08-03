## EigenTime — Phase 1

An offline-first desktop-style web app, adapted from the uploaded Gradz/StudyTracker HTML layout. All "StudyTracker"/Gradz branding is dropped and replaced with **EigenTime**. Nothing from the original site's server, sponsors, groups, leaderboard, or inbox carries over — this is a private, standalone tool.

### What gets built in this phase

**1. App shell (layout ported from the HTML)**

- Fixed left sidebar: EigenTime logo mark + nav (Dashboard, Timer, Subjects, Tasks, Analytics, Settings).
- Top bar: current date, daily goal chip, language toggle (EN/AR), collapse-sidebar button.
- Bi-directional layout: switching to Arabic flips the whole shell to RTL (sidebar, timeline, cards, icon direction) using logical CSS properties, so no mirrored duplicate styles are needed. Default is English/LTR.

**2. Design system (light glassmorphism)**

- Light-grey base with soft pastel radial ambient glows behind content.
- Semi-transparent glass cards: rounded corners, hairline borders, soft shadows.
- Accent tokens: cyan/mint (active timer), purple (subjects), orange (productivity), blue (elapsed time), emerald (completed goals).
- All colors/gradients/shadows defined as semantic tokens — no hardcoded colors in components.

**3. Local data layer — IndexedDB via Dexie**
Tables and fields:

- `subjects` — name, color, weeklyTargetHours, archived
- `sessions` — subjectId, startedAt, endedAt, durationSec, mode (focus/rest), difficulty, note
- `tasks` — title, subjectId, done, dueDate, order, tags
- `scheduleBlocks` — title, subjectId, startTime, endTime, date
- `settings` — dailyGoalHours, language, theme prefs
- `dailyStats` — date, totalSec, sessionCount, topSubjectId (rolled up on session save, so heatmap/analytics stay fast)

A typed repository module wraps Dexie so screens never touch the DB directly; a small seed of demo subjects/tasks is inserted on first run so the UI isn't empty. Export/import of the whole database as JSON is included (the HTML had CSV/JSON/PDF export).

**4. Arc ring chronograph timer (the core screen)**

- Circular SVG progress arc with smooth motion, radial minute ticks with 5-minute markers.
- Large HH:MM:SS readout, subject selector before start, count-up and countdown modes.
- Controls: Play, Pause, Resume, Skip, Reset, plus Undo/Redo of the last control action.
- Goal badge showing live % of the daily target.
- Timer state persists to IndexedDB and survives a page reload/app restart (elapsed time computed from wall-clock timestamps, not a tick counter).

**5. Dashboard**

- Quick metrics bar: 4 color-coded cards — Total Focused Hours, Today's Sessions, Top Subject, Productivity Completion Rate.
- Interactive daily task checklist with strike-through and category tags.
- Daily schedule timeline: vertical, color-coded past / active / upcoming.
- Recent activity feed digest.

**6. Subjects manager**

- Create/edit/archive subjects with color tag and weekly target hours; per-subject progress bar.

### Deferred to later phases

The 10 behavioral/predictive analytics features (biorhythm, flow driver, dispersion index, next-task predictor, fatigue warning, deep-flow indicator, rest calibration, lifestyle correlation, duration estimator, habit persistence), the 365-day heatmap, wave chart, and donut chart. Phase 1 records all the data these need, and the Analytics page ships as a laid-out placeholder so the navigation is complete.

Windows packaging (Electron) is also a later step — this phase runs fully offline in the browser with no network calls.

### Technical notes

- TanStack Start with file-based routes: `/` (dashboard), `/timer`, `/subjects`, `/tasks`, `/analytics`, `/settings`.
- All data access is client-side; every DB-touching component renders behind a hydration guard so server rendering never touches IndexedDB.
- Dexie + `dexie-react-hooks` for live-updating queries.
- Icons come from Lucide rather than the original Font Awesome bundle; fonts are self-hosted so nothing loads from the network.
- Timer math lives in a pure, testable module separate from the React component.
