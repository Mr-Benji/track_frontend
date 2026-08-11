# Track Workspace

A project-management web app for the **Health Intelligence Center** workspace — a ClickUp/Jira-lite tool for tracking projects, tasks, members, and departments. Built as a frontend prototype: there is no real backend, no database, and no authentication server. Everything is mocked in-memory and resets on page refresh.

## Tech stack

- **React 19** + **Vite 8**
- **Tailwind CSS 4**
- **TanStack Query** (`@tanstack/react-query`) for data fetching, caching, and mutations, with React Query Devtools enabled
- No router — navigation is a `useState` page switch inside `DashboardPage.jsx`
- No Redux/RTK — each feature owns its own mock "backend" (see below)
- `oxlint` for linting

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # oxlint
```

Sign in with the demo account shown on the login screen (`uweramaggy94@gmail.com` / `12345`) — auth is a mock check, not a real backend.

## Project structure

```
src/
├─ pages/              # one file per screen
│  ├─ LoginPage.jsx
│  ├─ DashboardPage.jsx    # shell: sidebar, topbar, workspace switcher, page router
│  ├─ HomePage.jsx
│  ├─ TasksPage.jsx        # Kanban / Table / Calendar views
│  ├─ ProjectsPage.jsx
│  ├─ MembersPage.jsx
│  ├─ Departmentspage.jsx
│  ├─ SprintsPage.jsx
│  ├─ FormsPage.jsx
│  └─ TeamAnalyticsPage.jsx
├─ components/          # shared, cross-page pieces
│  ├─ TaskDetailModal.jsx
│  ├─ TaskPreviewPopover.jsx
│  ├─ DashboardCalendar.jsx
│  ├─ RichTextEditor.jsx
│  └─ AssigneePicker.jsx
├─ features/<domain>/api.js   # mock "backend" per domain: seeded array + async
│                              # fetch/create/update functions with artificial
│                              # network delay, so loading states are real
└─ lib/dateUtils.js     # calendar grid + date formatting helpers
```

Each `features/*/api.js` module is a self-contained pretend database — an in-memory array plus functions like `fetchTasks`, `createTask`, `updateTaskStatus`, etc. TanStack Query wraps these the same way it would wrap real `fetch` calls, so swapping in a real API later means replacing the bodies of these functions, not the pages that call them.

## Features

### Home
Today's-tasks / week-deadlines / overdue-tasks stat cards, a full month/week/list calendar preview, a switchable dashboard layout ("Projects & Meetings" / "Tasks Focus" / "Projects Focus"), active-projects and needs-attention panels.

### Projects
Grid/list toggle, ongoing/archived tabs, search + date-range filter + sort, multi-department and multi-lead assignment, configurable workflow stages (with default stages marked), sprint opt-in per project, file attachments, access levels, and an "Other Projects" grouping separate from your home department's projects.

### Tasks
Kanban, Table, and Calendar views with a full filter bar (project / assignee / status / priority, My Tasks, workspace-wide vs archived scope). Task creation supports rich-text descriptions, required project/due-date validation, and a real draft state (**Save and Edit** creates a draft you can keep refining; **Create Task** publishes immediately). The task detail modal covers implementation narrative, subtasks, a merged activity-log + comments feed, file attachments, links, inline title editing, and a shareable link.

### Members
Active / Pending / Suspended tabs with counts, search + role filter, pagination.

### Departments
Cards showing each department's lead (highlighted avatar) and member roster.

### Beyond the original scope
Sprints, Forms, Meetings, and Team Analytics are also implemented, even though they were called out as out-of-scope in the original product requirements — bonus surface area, not required.

## Known limitations

These are expected for a frontend-only prototype, not bugs:

- **No persistence** — refreshing the page resets all data to its seed state.
- **No real authentication** — login checks against a hardcoded demo credential.
- **No router** — the app is single-page; the only working deep link is a shared task's `#task-<id>` hash (see `TaskDetailModal`'s Share button), which the app resolves on load by opening straight to that task.
