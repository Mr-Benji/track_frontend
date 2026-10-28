# Task Tracker — API Contract (frontend → backend handoff)

The frontend talks to the real backend for every feature — no mocks left.
This doc reflects what the backend actually does; entries were verified against a running backend.

- **Base URL (deployed):** `https://track-backend-mxtl.onrender.com` (frontend reads it from `VITE_API_URL`)
  - ⚠️ **Cold start:** Render free tier spins the service down after ~15 min idle. The first request after that takes 30–60s while it wakes up; every request after is fast. Not a bug — just let the loading spinner ride it out.
- **Format:** JSON in/out, `Content-Type: application/json`
- **Auth:** Bearer token in `Authorization: Bearer <token>` header on every request **except** `/auth/login`, `/auth/register`, `/auth/activate`
  - The backend reads the user's **role and status from the database on every request**, so a role change or a suspension applies immediately — no need to log in again. A suspended user's token stops working (403).
- **Errors:** always `{ "message": "human-readable reason" }` — including 403s and unexpected 500s — frontend reads `error.message`
- **IDs:** UUID strings, not numbers — applies to `id` fields in response bodies **and** to `:id`/`:subtaskId`/etc. segments in URL paths
- **Enums are title-cased** in responses: role → `Admin`/`User`, task status → the project's stage names, form status → `Open`/`Closed`
- **Names are unique** (case-insensitive): assignees, leads and attendees are referenced by name, so register, invite and renames reject a name someone already has (409).

### Status codes
| Code | Meaning | Notes |
|------|---------|-------|
| 200 / 201 / 204 | OK | 204 on deletes (empty body) |
| 400 | Bad request | validation failed, malformed body, or a bad id in the path — see `message` |
| 403 | Forbidden | missing/invalid/expired token, suspended account, **or** an action your role can't do — note it's 403, not 401 |
| 404 | Not found | wrong id or path — **also** returned for things you aren't allowed to see (private projects, other people's drafts) |
| 409 | Conflict | duplicate name, or delete blocked because the record is still referenced |
| 500 | Server error | `{ message: "Something went wrong on the server." }` — details are in the backend log |

### Who can do what
Admin-only (others get 403; the UI hides these buttons for non-admins): create/edit/delete **projects**, **sprints**, **departments**; invite/edit/suspend **members**; edit/delete **meetings**.
Everyone: create tasks, meetings, forms and workspaces; edit tasks they can see; delete **their own drafts** (admins can delete any task).

---

## Auth & profile

### `POST /auth/login`
Request: `{ email, password }`
Response: `{ user: User, token }`. 403 if the account is suspended.

### `POST /auth/register`
Request: `{ fullName, email, password }` — **note the field is `fullName`, not `name`**.
Response: same shape as login. New users default to role `User`. 409 if the email or the name is taken.

### `POST /auth/activate`
For invited members (created via `POST /members/invite`, status `"Pending"`) to set their password and log in for the first time.
Request: `{ email, password }` → same shape as login. Flips `status` from `"Pending"` to `"Active"`.
Frontend page: `<FRONTEND_URL>/#activate?email=<url-encoded email>` (see `src/pages/ActivatePage.jsx`).

### `GET /me` → `User`
Restores the session from a stored token after a page reload (`App.jsx`). 403 if the token is no longer valid.

### `PATCH /me` — any of `{ name, email, emailNotifications, workspaceId }` → `{ user: User, token }`
- Used by the Profile and Settings dialogs and the workspace switcher.
- **Always store the returned token**: the token is tied to the email, so after an email change the old token stops working.
- 409 if the name or email belongs to someone else; 404 for an unknown `workspaceId`.
- A rename is carried over to meeting attendee lists.

**User shape:**
```json
{
  "id": "uuid", "name": "string", "email": "string", "role": "Admin | User",
  "title": "string | null", "department": "string (\"\" if none)",
  "emailNotifications": true, "workspaceId": "uuid | null"
}
```
`department` drives the "<department> Projects" grouping on the Projects page.

---

## Workspaces

### `GET /workspaces` → `[{ id, name }]` (oldest first)
### `POST /workspaces` — `{ name }` → `{ id, name }`. 409 if the name exists.
The selected workspace is saved per user with `PATCH /me { workspaceId }`; `null` means "the first one".
⚠️ Workspaces are a shared list only — **data is not separated per workspace yet**.

---

## Tasks

Visibility: a task is hidden (404, and left out of `GET /tasks`) if its project is hidden from you, or if it's **someone else's draft** — drafts are visible only to their creator, admins included.

### `GET /tasks` → `Task[]`
### `PATCH /tasks/:id/status` — `{ status, author }` → `Task` (server appends the activity-log entry). `status` is a stage name of the task's project.
### `PATCH /tasks/:id` — partial merge-patch → `Task`, any of `{ title, description, narrative, priority, startDate, dueDate, isDraft, projectId }`
- `startDate` is a tri-state, same as project `start`/`end`: omitted/`null` leaves it untouched, `""` clears it, anything else is parsed as a new date (invalid → 400).
- `projectId` moves the task to another project. Its status carries over to a same-named stage on the new project if one exists, otherwise it resets to that project's first stage. If the task was in a sprint tied to the old project, it returns to the backlog (`sprintId: null`). A task can't be detached from all projects — `null` is a no-op.
### `DELETE /tasks/:id` → 204. Admins can delete any task; anyone else only their own drafts (403 otherwise).
### `POST /tasks` — `{ title, description, projectId, assignees[], priority, startDate, dueDate, isDraft, sprintId }` → new `Task` in the project's first stage
- The caller is recorded as `createdBy` and as the author of the "Created" activity entry.
- `sprintId` optional — links the new task to that sprint. 404 if the sprint doesn't exist; 409 if the sprint belongs to a different project than `projectId`.
### `POST /tasks/:id/assignees` — `{ name }` → `Task`
### `DELETE /tasks/:id/assignees/:name` → `Task`
### `POST /tasks/:id/comments` — `{ author, text }` → `Task`
### `PATCH /tasks/:id/subtasks/:subtaskId/toggle` → `Task` (no body needed; flips `done`)
### `POST /tasks/:id/subtasks` — `{ text }` → `Task`
### `POST /tasks/:id/links` — `{ label, url }` → `Task`
### `DELETE /tasks/:id/links/:linkId` → `Task`
### `POST /tasks/:id/files` — `{ name }` → `Task` (stub — no real binary upload)
### `DELETE /tasks/:id/files/:fileId` → `Task`

Shared task links are `<FRONTEND_URL>/#task-<uuid>`; the Tasks page opens that task on load.

**Task shape** (backend computes `progress`/`overdue`; frontend only derives short date labels and primary assignee):
```json
{
  "id": "uuid", "title": "string", "assignees": ["string"],
  "priority": "Low | Medium | High | Urgent",
  "startDate": "YYYY-MM-DD | null", "dueDate": "YYYY-MM-DD",
  "status": "a stage name, e.g. To Do | In Progress | Review | Done",
  "projectId": "uuid", "sprintId": "uuid | null",
  "description": "string", "narrative": "string", "isDraft": false,
  "progress": 0, "overdue": false,
  "subtasks": [{ "id": "uuid", "text": "string", "done": false }],
  "comments": [{ "id": "uuid", "author": "string", "text": "string", "timestamp": "ISO 8601" }],
  "files": [{ "id": "uuid", "name": "string" }],
  "links": [{ "id": "uuid", "label": "string", "url": "string" }],
  "activityLog": [{ "id": "uuid", "type": "system", "change": "To Do → In Progress", "progressChange": "0% → 50%", "author": "string", "timestamp": "ISO 8601" }],
  "createdAt": "ISO 8601",
  "createdBy": "string | null (null for tasks created before creators were recorded)"
}
```

---

## Projects

**Access levels** (`accessLevel`): admins see every project. Otherwise —
- `Full Access`: everyone.
- `Restricted`: project leads, people assigned to one of its tasks, and members of any of its departments.
- `Private`: project leads and people assigned to one of its tasks.

Hidden projects are left out of `GET /projects` and return 404 by id; their tasks and sprints are hidden too.

### `GET /projects` → `Project[]` (only the ones you can see)
### `POST /projects` — `{ name, departments[], leads[], description, start, end, workflowStages[], sprintsEnabled, files[], accessLevel }` → new `Project`, `status: "Planning"`, `trackingMode: "Manual"`
### `PATCH /projects/:id` — full merge-patch, any of the create fields plus `archived` (the edit form's "Archived" checkbox)
- `start`/`end`: omitted/`null` leaves the date, `""` clears it.

**Workflow stages** (`workflowStages[]` on create and patch — only each item's `name` is read; `id`/`isDefault` are ignored):
- `To Do`, `In Progress` and `Done` always exist and can't be removed. Custom stages are placed between `In Progress` and `Done`, in the order sent. Names are matched case-insensitively; duplicates are dropped.
- `progressPercentage` is spread evenly from `To Do` (0) to `Done` (100) — e.g. one custom stage gives 0 / 33 / 67 / 100. A task's `progress` follows its stage, so adding or removing stages shifts it. Only `Done` (100) counts as completed.
- On patch the list replaces the custom stages: one left out is removed — **409** if any task is still in it. Omit `workflowStages` (or send `null`) to leave stages untouched.

**Files** (`files[]` on create and patch — the form sends its whole list):
- An entry whose `id` is one of the project's existing file ids is kept; any other entry (the form's temporary numeric ids) is added by `name`; existing files left out are removed. Omit `files` to leave them untouched.

### `DELETE /projects/:id` — 204; 409 if it still has tasks you can see. Other people's private drafts don't block deletion and are removed with the project.
### `POST /projects/:id/files` — `{ name }` → `Project` (stub)
### `DELETE /projects/:id/files/:fileId` → `Project`

**Project shape** — `start`/`end` are **ISO** (`"2026-09-01"`); frontend converts for display at the API boundary (`src/features/projects/api.js`, keeping `startISO`/`endISO`):
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
### `POST /members/invite` — `{ name, email, title, department }` → new `Member`, `role: "User"`, `status: "Pending"`. `department` must match an existing department name. 409 if the email or name is taken. Sends the activation email when mail is configured on the server (`MAIL_*` env vars).
### `PATCH /members/:id` — partial merge-patch → `Member`, any of `{ fullName, title, role, status, department }`
- `department`: a department name moves someone, `""` removes them from their department, omitted leaves it.
- `status`: `Active` reactivates a suspended member (the edit dialog offers Active/Suspended).
### `DELETE /members/:id` — soft-delete, flips `status` to `Suspended`. A suspended member can't log in and their existing token stops working immediately.

**Member shape:**
```json
{
  "id": "uuid", "name": "string", "email": "string", "title": "string | null",
  "role": "Admin | User",
  "status": "Active | Pending | Suspended",
  "department": "string", "joined": "YYYY-MM-DD"
}
```

---

## Departments

### `GET /departments` → `Department[]`
### `POST /departments` — `{ name, lead }` → new `Department`
- `name` must be unique
- `lead` is optional (empty string → `lead: null`), but **if provided must match an existing member's name** — fails with `"No user found with name: X"` otherwise. Setting a lead also adds that person to the department.
### `PATCH /departments/:id` — partial merge-patch → `Department`
### `DELETE /departments/:id` — 204; 409 if it still has members (reassign them via `PATCH /members/:id` first) or is linked to any projects, by design.

**Department shape:** `{ id, name, lead: string | null, members: number, people: string[] }`

---

## Sprints

Sprints tied to a project you can't see are hidden.

### `GET /sprints` → `Sprint[]`
### `POST /sprints` — `{ name, goal, status? }` → new `Sprint`. `status` defaults to `"Planning"`.
### `PATCH /sprints/:id` — partial merge-patch → `Sprint`, any of `{ name, goal, start, end, status }`
- `status` is `Planning`/`Active`/`Completed`; invalid values return 400.
### `DELETE /sprints/:id` — 204; disbands the sprint and returns its tasks to the backlog
### `POST /sprints/:sprintId/tasks/:taskId` / `DELETE` same path — add/remove an existing task (not used by the UI yet)

**Sprint shape:** `{ id, name, goal, status: "Planning | Active | Completed", start, end, tasks: number, done: number, velocity: number }` (`velocity` is not computed yet — always 0)

---

## Forms

### `GET /forms` → `Form[]`
### `GET /forms/:id` → `Form`
### `POST /forms` — `{ title, description, target?, fields[] }` → new `Form`, `status: "Open"`, owner = the caller
### `PATCH /forms/:id` — any of `{ title, description, status, target, fields }`. **Owner or Admin only** (403 otherwise).
- `status`: `Open` or `Closed` (case-insensitive; anything else → 400).
- `target`: a number; `0` or less clears it; omitted leaves it.
- `fields` replaces the whole question list: an entry with the `id` of an existing question edits it in place (its answers stay linked), entries without `id` are added, questions left out are removed (old answers keep the question's label).

**Field (question):** `{ id, label, type: "text" | "paragraph" | "choice", required: boolean, options: string[] }` — `choice` needs at least one option.

### `POST /forms/:id/responses` — `{ answers: [{ fieldId, value }] }` → `Response` (201)
- 409 if the form is Closed or you already responded (one response per person).
- 400 if a required question is blank, a choice isn't one of the options, or a `fieldId` isn't on the form.
### `GET /forms/:id/responses` → `Response[]` (newest first). **Owner or Admin only** (403 otherwise).
### `GET /forms/responses/mine` → `Response[]` — the caller's own responses ("My responses" tab).

**Form shape:**
```json
{
  "id": "uuid", "title": "string", "description": "string", "owner": "string (the owner's name)",
  "status": "Open | Closed", "questions": 2, "responses": 5, "target": "number | null",
  "created": "YYYY-MM-DD",
  "fields": [{ "id": "uuid", "label": "string", "type": "text", "required": true, "options": [] }],
  "canManage": true, "respondedByMe": false
}
```
`canManage` = you own the form or are an Admin (controls Edit / View responses in the UI).

**Response shape:** `{ id, formId, formTitle, respondent: "string", submittedAt: "ISO 8601", answers: [{ fieldId: "uuid | null", label, value: "string | null" }] }`

---

## Meetings

### `GET /meetings` → `Meeting[]` (sorted by `date` ascending; includes past meetings)
### `POST /meetings` — `{ title, date, time, attendees[] }` → new `Meeting`
### `PATCH /meetings/:id` — partial merge-patch, any of `{ title, date, time, attendees }`. `attendees` replaces the list; omit it to leave attendees untouched. Admin-only.
### `DELETE /meetings/:id` — 204. Admin-only.
Attendees are member names; an unknown name → 404 `"No user found with name: X"`. Names are saved in the member's own spelling.

**Meeting shape:** `{ id, title, date: "YYYY-MM-DD", time: "string", attendees: string[] }`

---

## Still outstanding

- **Workspaces don't separate data** — the list and each user's selection are stored, but projects/tasks/etc. are shared across workspaces.
- **Email notifications preference** is stored (`emailNotifications`) but nothing sends task/project update emails yet; only invite emails exist.
- **Comment and status-change `author`** is taken from the request body, not the token.
- No real file upload (binary storage) — `files` just store a `name` string. Agreed out of scope.
- No pagination on any list endpoint.
- Sprint `velocity` isn't computed, and no form sets sprint `start`/`end`.

## Decided, not building

- **Department-project unlink endpoint** — a department linked to a project can't be deleted (409) and there's no way to unlink it short of deleting the project. Decided this is acceptable behavior, not a gap — a department tied to a real project shouldn't be casually deletable anyway.
