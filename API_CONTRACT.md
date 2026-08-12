# Task Tracker — API Contract (frontend → backend handoff)

The frontend now talks to the real, deployed backend for every feature — no mocks left.
This doc reflects what's actually live and verified, not just planned.

- **Base URL (deployed):** `https://track-backend-mxtl.onrender.com` (frontend reads it from `VITE_API_URL`)
  - ⚠️ **Cold start:** Render free tier spins the service down after ~15 min idle. The first request after that takes 30–60s while it wakes up; every request after is fast. Not a bug — just let the loading spinner ride it out.
- **Format:** JSON in/out, `Content-Type: application/json`
- **Auth:** Bearer token in `Authorization: Bearer <token>` header on every request **except** `/auth/login`, `/auth/register`, `/auth/activate`
- **Errors:** confirmed shape is always `{ "message": "human-readable reason" }` — frontend reads `error.message`
- **IDs:** UUID strings, not numbers — applies to `id` fields in response bodies **and** to `:id`/`:subtaskId`/etc. segments in URL paths
- **Enums are title-cased** in responses: role → `Admin`/`Manager`/`User`, task status → `To Do`/`In Progress`/`Done`, form status → `Open`/`Closed`

### Status codes
| Code | Meaning | Notes |
|------|---------|-------|
| 200 / 201 / 204 | OK | 204 on some deletes (empty body) |
| 400 | Bad request | validation failed, see `message` |
| 403 | Forbidden | missing/invalid/expired token, **or** admin-only op attempted without Admin role — note it's 403, not 401 |
| 404 | Not found | wrong id or path |
| 409 | Conflict | duplicate name, or delete blocked because the record is still referenced (e.g. deleting a department that still has members) |

---

## Auth

### `POST /auth/login`
Request: `{ email, password }`
Response: `{ user: { name, email, role }, token }`
Errors: 401 in the mock era, but the deployed backend returns a normal error-shaped 4xx — check `message`.

### `POST /auth/register`
Request: `{ fullName, email, password }` — **note the field is `fullName`, not `name`**.
Response: same shape as login (`{ user, token }`). New users default to role `User`.
Not currently wired up in the frontend UI (no signup page built) — available if needed later.

### `POST /auth/activate`
For invited members (created via `POST /members/invite`, status `"Pending"`) to set their password and log in for the first time.
Request: `{ email, password }`
Response: `{ user: { name, email, role }, token }` — same shape as `/auth/login`. Flips the member's `status` from `"Pending"` to `"Active"`.

Frontend page for this: `<FRONTEND_URL>/#activate?email=<url-encoded email>` (see `src/pages/ActivatePage.jsx`). Pre-fills the email from the link, invited person sets a password, submits to this endpoint.

⚠️ **Still needed from backend:** confirm `POST /members/invite` actually sends an email with that activation link — unconfirmed as of this writing.

---

## Tasks

### `GET /tasks` → `Task[]`
### `PATCH /tasks/:id/status` — `{ status, author }` → `Task` (server appends the activity-log entry)
### `PATCH /tasks/:id` — partial merge-patch → `Task`
### `DELETE /tasks/:id` → confirmed working (204), wired in `TaskDetailModal`
### `POST /tasks` — `{ title, description, projectId, assignees[], priority, startDate, dueDate, isDraft, sprintId }` → new `Task`, `status: "To Do"`
### `POST /tasks/:id/assignees` — `{ name }` → `Task`
### `DELETE /tasks/:id/assignees/:name` → `Task`
### `POST /tasks/:id/comments` — `{ author, text }` → `Comment`
### `PATCH /tasks/:id/subtasks/:subtaskId/toggle` → `Subtask`
### `POST /tasks/:id/subtasks` — `{ text }` → `Subtask`
### `POST /tasks/:id/links` — `{ label, url }` → `Link`
### `DELETE /tasks/:id/links/:linkId` → `Task`
### `POST /tasks/:id/files` — `{ name }` → `File` (stub — no real binary upload)
### `DELETE /tasks/:id/files/:fileId` → `Task`

**Task shape** (confirmed live — backend computes `progress`/`overdue` server-side, frontend only derives short date labels and primary assignee):
```json
{
  "id": "uuid", "title": "string", "assignees": ["string"],
  "priority": "Low | Medium | High | Urgent",
  "startDate": "YYYY-MM-DD | null", "dueDate": "YYYY-MM-DD",
  "status": "To Do | In Progress | Done",
  "projectId": "uuid", "sprintId": null,
  "description": "string", "narrative": "string", "isDraft": false,
  "progress": 0, "overdue": false,
  "subtasks": [{ "id": "uuid", "text": "string", "done": false }],
  "comments": [{ "id": "uuid", "author": "string", "text": "string", "timestamp": "ISO 8601" }],
  "files": [{ "id": "uuid", "name": "string" }],
  "links": [{ "id": "uuid", "label": "string", "url": "string" }],
  "activityLog": [{ "id": "uuid", "type": "system", "change": "To Do → In Progress", "progressChange": "0% → 50%", "author": "string", "timestamp": "ISO 8601" }],
  "createdAt": "ISO 8601"
}
```

---

## Projects

### `GET /projects` → `Project[]`
### `POST /projects` — `{ name, departments[], leads[], description, start, end, workflowStages[], sprintsEnabled, files[], accessLevel }` → new `Project`, `status: "Planning"`, `trackingMode: "Manual"`
### `PATCH /projects/:id` — **confirmed: full merge-patch, all fields work** (`name`, `leads`, `departments`, `accessLevel` tested directly)
### `DELETE /projects/:id` — confirmed working (204). Not blocked by 409 in testing even with an empty project — presumably 409s if tasks reference it, untested.
### `POST /projects/:id/files` — `{ name }` → `File` (stub)
### `DELETE /projects/:id/files/:fileId` → `Project`

**Project shape** — `start`/`end` are **ISO** (`"2026-09-01"`), not `"DD Mon YYYY"` as originally assumed; frontend converts for display at the API boundary (`src/features/projects/api.js`):
```json
{
  "id": "uuid", "name": "string", "departments": ["string"], "leads": ["string"],
  "status": "Active | Overdue | Planning", "trackingMode": "Auto | Manual",
  "start": "YYYY-MM-DD | null", "end": "YYYY-MM-DD | null",
  "createdAt": "ISO 8601", "tasks": 12, "completed": 9, "archived": false,
  "description": "string | null",
  "workflowStages": [{ "id": "uuid", "name": "To Do", "isDefault": true, "progressPercentage": 0, "displayOrder": 0 }],
  "sprintsEnabled": true, "files": [{ "id": "uuid", "name": "string" }],
  "accessLevel": "Full Access | Restricted | Private"
}
```

---

## Members

### `GET /members` → `Member[]`
### `POST /members/invite` — `{ name, email, title, department }` → new `Member`, `role: "User"`, `status: "Pending"`. `department` required, must match an existing department name.
### `PATCH /members/:id` — partial merge-patch → `Member`
- ✅ **Fixed and confirmed** (was broken, reported, now verified live): `department` accepts a real department name to move someone, `""` to remove them from a department, or can be omitted to leave unchanged. All three behaviors tested directly.
### `DELETE /members/:id` — soft-delete, flips `status` to `Suspended` rather than removing the record. Confirmed structural/admin ops require an Admin-role token (else 403).

**Member shape:**
```json
{
  "id": "uuid", "name": "string", "email": "string", "title": "string | null",
  "role": "Admin | Manager | User",
  "status": "Active | Pending | Suspended",
  "department": "string", "joined": "YYYY-MM-DD"
}
```

---

## Departments

### `GET /departments` → `Department[]`
### `POST /departments` — `{ name, lead }` → new `Department`
- `name` must be unique
- `lead` is optional (empty string → `lead: null`), but **if provided must exactly match an existing member's name** — `POST` fails with `"No user found with name: X"` otherwise. Setting a real lead name also adds that person as a member of the department.
### `PATCH /departments/:id` — confirmed working, partial merge-patch → `Department`
### `DELETE /departments/:id` — confirmed working: 409 `"Cannot delete a department that still has members..."` if it has members (now resolvable — reassign members via the now-fixed `PATCH /members/:id`, then delete succeeds, 204); also 409 if the department is linked to any projects, by design.

**Department shape:** `{ id, name, lead: string | null, members: number, people: string[] }`

---

## Sprints

### `GET /sprints` → `Sprint[]`
### `POST /sprints` — `{ name, goal, status? }` → new `Sprint`. `status` optional, defaults to `"Planning"`; can be set directly on create now.
### `PATCH /sprints/:id` — partial merge-patch → `Sprint`, any of `{ name, goal, startDate, endDate, status }`
- ✅ **Fixed and confirmed** (was broken, reported three times, now verified live): `status` is a real, manually-set field — `Planning`/`Active`/`Completed` only, invalid values return `400` with a clear message. Was previously auto-derived from `start`/`end` dates the frontend never set, which is why it always silently stuck at `Planning`.
### `DELETE /sprints/:id` — confirmed working (204); disbands the sprint and returns its tasks to the backlog

**Sprint shape:** `{ id, name, goal, status: "Planning | Active | Completed", start, end, tasks: number, done: number, velocity: number }`

---

## Forms

### `GET /forms` → `Form[]`
### `POST /forms` — `{ title, description }` → new `Form`, `status: "Open"`, `owner` set from the auth token
### `PATCH /forms/:id` — confirmed working — `{ title, description, status }`, any subset

**Form shape:** `{ id, title, description, owner, status: "Open | Closed", questions: number, responses: number, target: number | null, created }`

---

## Meetings

### `GET /meetings` → `Meeting[]` (sorted by `date` ascending)
### `POST /meetings` — `{ title, date, time }` → new `Meeting`, `attendees: []`
### `PATCH /meetings/:id` — confirmed working, partial merge-patch → `Meeting`
### `DELETE /meetings/:id` — confirmed working (204)

**Meeting shape:** `{ id, title, date: "YYYY-MM-DD", time: "string", attendees: string[] }`

---

## Still outstanding

- **Invite emails** — in progress. Decided in scope: `POST /members/invite` should send a real email (SMTP/SendGrid/etc.) with the activation link, not just create a pending record. Not live yet.
- No real file upload (binary storage) — `files`/`addFile` just store a `name` string. Explicitly agreed out of scope for the deadline.
- No pagination on any list endpoint.
- `DELETE /projects/:id` 409-when-referenced-by-tasks behavior untested (deleted an empty project successfully; haven't tried deleting one with tasks attached).

## Decided, not building

- **Department-project unlink endpoint** — a department linked to a project can't be deleted (409) and there's no way to unlink it short of deleting the project. Decided this is acceptable behavior, not a gap — a department tied to a real project shouldn't be casually deletable anyway.
