# Task Tracker — API Contract (frontend → backend handoff)

The frontend currently runs on in-memory mock functions (`src/features/*/api.js`).
Everything below is reverse-engineered from those mocks — implement these
endpoints and the frontend can swap `apiClient` calls in with no other changes.

- **Base URL:** `http://localhost:8080` (frontend reads it from `VITE_API_URL`)
- **Format:** JSON in/out, `Content-Type: application/json`
- **Auth:** Bearer token in `Authorization: Bearer <token>` header on every request **except** `/auth/login`, `/auth/register`, `/auth/activate`
- **Errors:** return a 4xx/5xx with a plain error message in the body (frontend just does `throw new Error(message)`) — agree on `{ "message": "..." }` vs plain text before starting
- **IDs:** UUID strings, not numbers — applies to `id` fields in response bodies **and** to `:id`/`:subtaskId`/etc. segments in URL paths

---

## Auth

### `POST /auth/login`
Request: `{ email, password }`
Response: `{ user: { name, email, role }, token }`
Errors: 401 — "No account found with that email." / "Incorrect password."

### `POST /auth/register`
⚠️ Not covered by the current frontend mock — request/response shape TBD with backend. Flagging here only because it's confirmed to be one of the no-auth-required routes.

### `POST /auth/activate`
For invited members (created via `POST /members/invite`, status `"Pending"`) to set their password and log in for the first time.
Request: `{ email, password }`
Response: `{ user: { name, email, role }, token }` — assumed same shape as `/auth/login`; confirm with backend.
⚠️ Ask backend: does this also flip the member's `status` from `"Pending"` to `"Active"`?

---

## Tasks

### `GET /tasks` → `Task[]`

### `PATCH /tasks/:id/status`
Request: `{ status, author }`
Response: updated `Task` (server should append an activity-log entry recording the status transition and progress change)

### `PATCH /tasks/:id`
Request: partial `Task` (merge-patch)
Response: updated `Task`

### `POST /tasks`
Request: `{ title, description, projectId, assignees[], priority, startDate, dueDate, isDraft, sprintId }`
Validation: `title` required, `projectId` required, `dueDate` required
Response: new `Task` with `status: "To Do"`, empty `subtasks/comments/files/links`, and one `"Created"` activity-log entry

### `POST /tasks/:id/assignees` — `{ name }` → `Task`
### `DELETE /tasks/:id/assignees/:name` → `Task`
### `POST /tasks/:id/comments` — `{ author, text }` → `Comment`
### `PATCH /tasks/:id/subtasks/:subtaskId/toggle` → `Subtask`
### `POST /tasks/:id/subtasks` — `{ text }` → `Subtask`
### `POST /tasks/:id/links` — `{ label, url }` → `Link`
### `DELETE /tasks/:id/links/:linkId` → `Task`
### `POST /tasks/:id/files` — `{ name }` → `File`
### `DELETE /tasks/:id/files/:fileId` → `Task`

**Task shape:**
```json
{
  "id": "uuid",
  "title": "string",
  "assignees": ["string"],
  "priority": "Low | Medium | High | Urgent",
  "startDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "status": "To Do | In Progress | Done",
  "projectId": "uuid",
  "sprintId": null,
  "description": "string",
  "narrative": "string",
  "isDraft": false,
  "subtasks": [{ "id": "uuid", "text": "string", "done": false }],
  "comments": [{ "id": "uuid", "author": "string", "text": "string", "timestamp": "ISO 8601" }],
  "files": [{ "id": "uuid", "name": "string" }],
  "links": [{ "id": "uuid", "label": "string", "url": "string" }],
  "activityLog": [{ "id": "uuid", "type": "system", "change": "To Do → In Progress", "progressChange": "0% → 50%", "author": "string", "timestamp": "ISO 8601" }],
  "createdAt": "ISO 8601"
}
```
⚠️ **Open question for backend dev:** the frontend currently *derives* `start`/`due` (short date labels), `overdue` (bool), `progress` (%), and `assignee` (primary assignee) client-side from the raw fields above. Decide together whether that logic stays client-side (backend just returns the raw shape above) or moves server-side (backend returns those computed fields too).

Status → progress mapping used by the frontend: `To Do: 0%`, `In Progress: 50%`, `Done: 100%`.

---

## Projects

### `GET /projects` → `Project[]`
### `POST /projects`
Request: `{ name, departments[], leads[], description, start, end, workflowStages[], sprintsEnabled, files[], accessLevel }`
Validation: `name` must be unique (case-insensitive)
Response: new `Project` with `status: "Planning"`, `trackingMode: "Manual"`, `tasks: 0`, `completed: 0`, `archived: false`

### `POST /projects/:id/files` — `{ name }` → `File`
### `DELETE /projects/:id/files/:fileId` → `Project`

**Project shape:**
```json
{
  "id": "uuid",
  "name": "string",
  "departments": ["string"],
  "leads": ["string"],
  "status": "Active | Overdue | Planning",
  "trackingMode": "Auto | Manual",
  "start": "DD Mon YYYY",
  "end": "DD Mon YYYY",
  "createdAt": "YYYY-MM-DD",
  "tasks": 12,
  "completed": 9,
  "archived": false,
  "description": "string",
  "workflowStages": [{ "id": "uuid", "name": "To Do", "isDefault": true }],
  "sprintsEnabled": true,
  "files": [{ "id": "uuid", "name": "string" }],
  "accessLevel": "Full Access | Restricted | Private"
}
```
⚠️ Ask: are `tasks`/`completed` stored counters or computed live from the tasks table? (Mock just stores static numbers.)

---

## Members

### `GET /members` → `Member[]`
### `POST /members/invite`
Request: `{ name, email, title, department }`
Validation: `name`, `email`, and `department` required (`department` must be one of the existing department names — the frontend now selects it from `GET /departments`); `email` must be unique
Response: new `Member` with `role: "User"`, `status: "Pending"`

**Member shape:**
```json
{
  "id": "uuid", "name": "string", "email": "string", "title": "string",
  "role": "Admin | Manager | User",
  "status": "Active | Pending | Suspended",
  "department": "string", "joined": "YYYY-MM-DD"
}
```

---

## Departments

### `GET /departments` → `Department[]`
### `POST /departments`
Request: `{ name, lead }`
Validation: `name` must be unique
Response: new `Department` with `members: 1`, `people: [lead]`

**Department shape:** `{ id, name, lead, members: number, people: string[] }`

---

## Sprints

### `GET /sprints` → `Sprint[]`
### `POST /sprints`
Request: `{ name, goal }`
Validation: `name` must be unique
Response: new `Sprint` with `status: "Planning"`, `tasks: 0`, `done: 0`, `velocity: 0`

**Sprint shape:** `{ id, name, goal, status: "Planning | Active | Completed", start, end, tasks: number, done: number, velocity: number }`

---

## Forms

### `GET /forms` → `Form[]`
### `POST /forms`
Request: `{ title, description }`
Validation: `title` must be unique
Response: new `Form` with `status: "Open"`, `questions: 0`, `responses: 0`

**Form shape:** `{ id, title, description, owner, status: "Open | Closed", questions: number, responses: number, target: number, created }`

---

## Meetings

### `GET /meetings` → `Meeting[]` (sorted by `date` ascending)
### `POST /meetings`
Request: `{ title, date, time }`
Validation: `title` and `date` required
Response: new `Meeting` with `attendees: []`

**Meeting shape:** `{ id, title, date: "YYYY-MM-DD", time: "string", attendees: string[] }`

---

## Not yet in the mock (flag to backend dev, don't assume)

- No pagination on any list endpoint (mock returns entire arrays) — decide if real API needs it
- No real password hashing / JWT — mock returns a hardcoded fake token
- No file upload — `files`/`addFile` just store a `name` string, no actual binary upload
- No delete/archive endpoints for projects, members, departments, sprints, or forms themselves (only sub-resources)
