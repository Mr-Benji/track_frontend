# Task Tracker — API Contract (frontend → backend handoff)

The frontend talks to the real backend for every feature — no mocks left.
This doc reflects what the backend actually does; entries were verified against a running backend.

- **Base URL (deployed):** `https://track-backend-mxtl.onrender.com` (frontend reads it from `VITE_API_URL`)
  - ⚠️ **Cold start:** Render free tier spins the service down after ~15 min idle. The first request after that takes 30–60s while it wakes up; every request after is fast. Not a bug — just let the loading spinner ride it out.
- **Format:** JSON in/out, `Content-Type: application/json`
- **Auth:** Bearer token in `Authorization: Bearer <token>` header on every request **except** `/auth/*` (login, register, activate, forgot-password, reset-password)
  - The backend reads the user's **role and status from the database on every request**, so a role change or a suspension applies immediately — no need to log in again. A suspended user's token stops working (401).
- **Errors:** always `{ "message": "human-readable reason" }` — including 403s and unexpected 500s — frontend reads `error.message`
- **IDs:** UUID strings, not numbers — applies to `id` fields in response bodies **and** to `:id`/`:subtaskId`/etc. segments in URL paths
- **Enums are title-cased** in responses: role → `Admin`/`User`, task status → the project's stage names, form status → `Open`/`Closed`
- **Names are unique** (case-insensitive): assignees, leads and attendees are referenced by name, so register, invite and renames reject a name someone already has (409).

### Status codes
| Code | Meaning | Notes |
|------|---------|-------|
| 200 / 201 / 204 | OK | 204 on deletes (empty body) |
| 400 | Bad request | validation failed, malformed body, or a bad id in the path — see `message` |
| 401 | Not signed in | missing/invalid/expired token, or the account was suspended/removed — `{ message: "Your session has expired. Please log in again." }`. The frontend clears the token and returns to the login page (`apiClient.js` → `App.jsx`). |
| 403 | Forbidden | signed in, but your role can't do this (e.g. a non-admin editing a project) |
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

### `POST /auth/forgot-password` — `{ email }` → `{ message }` (always 200, same message whether or not the email exists)
Emails an active account a single-use link `<FRONTEND_URL>/#reset?token=…`, valid for one hour. Only a hash of the token is stored.

### `POST /auth/reset-password` — `{ token, password }` → `{ user: User, token }` (sets the password and logs in)
400 if the link is invalid, expired or already used; 403 if the account is suspended. Frontend: `PasswordResetPage.jsx` (both steps).

### `GET /me` → `User`
Restores the session from a stored token after a page reload (`App.jsx`). 401 if the token is no longer valid.

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
The selected workspace is saved per user with `PATCH /me { workspaceId }`; `null` means "the first (oldest) one".

**Workspaces separate data.** Projects (and so their tasks), sprints, meetings and forms belong to one workspace:
- `GET /projects`, `/tasks`, `/sprints`, `/meetings`, `/forms` return only the caller's current workspace.
- Creating one of those puts it in the caller's current workspace. Names only have to be unique within a workspace.
- Members, departments and roles are organisation-wide (the same in every workspace).
- After switching workspace the frontend refetches everything (`DashboardPage` invalidates all queries).

---

## Tasks

Visibility: a task is hidden (404, and left out of `GET /tasks`) if its project is hidden from you, or if it's **someone else's draft** — drafts are visible only to their creator, admins included.

### `GET /tasks` → `Task[]`
### `GET /tasks/:id` → `Task` — works for a task in any workspace you can see; used to open shared links and email links to a task outside the current list.
### `PATCH /tasks/:id/status` — `{ status }` → `Task` (server appends the activity-log entry). `status` is a stage name of the task's project. The entry's author is the signed-in user; an `author` field in the body is ignored.
### `PATCH /tasks/:id` — partial merge-patch → `Task`, any of `{ title, description, narrative, priority, startDate, dueDate, isDraft, projectId, sprintId }`
- `sprintId`: omitted/`null` leaves it, `""` moves the task back to the backlog, a sprint id puts it in that sprint (409 if the sprint belongs to another project or workspace; 400 for a malformed id). The task window's **Sprint** field uses this.
- `startDate` is a tri-state, same as project `start`/`end`: omitted/`null` leaves it untouched, `""` clears it, anything else is parsed as a new date (invalid → 400).
- `projectId` moves the task to another project. Its status carries over to a same-named stage on the new project if one exists, otherwise it resets to that project's first stage. If the task was in a sprint tied to the old project, it returns to the backlog (`sprintId: null`). A task can't be detached from all projects — `null` is a no-op.
### `DELETE /tasks/:id` → 204. Admins can delete any task; anyone else only their own drafts (403 otherwise).
### `POST /tasks` — `{ title, description, projectId, assignees[], priority, startDate, dueDate, isDraft, sprintId }` → new `Task` in the project's first stage
- The caller is recorded as `createdBy` and as the author of the "Created" activity entry.
- `sprintId` optional — links the new task to that sprint. 404 if the sprint doesn't exist; 409 if the sprint belongs to a different project than `projectId`.
### `POST /tasks/:id/assignees` — `{ name }` → `Task`
### `DELETE /tasks/:id/assignees/:name` → `Task`
### `POST /tasks/:id/comments` — `{ text }` → `Task`. The author is the signed-in user (`author` in the body is ignored).
### `PATCH /tasks/:id/subtasks/:subtaskId/toggle` → `Task` (no body needed; flips `done`)
### `POST /tasks/:id/subtasks` — `{ text }` → `Task`
### `POST /tasks/:id/links` — `{ label, url }` → `Task`
### `DELETE /tasks/:id/links/:linkId` → `Task`
### `POST /tasks/:id/files` — **multipart/form-data**, the file in the `file` part → `Task` (max 10 MB → 413 otherwise)
- Still accepts JSON `{ name }` for a name-only entry (no content), as before uploads existed.
### `GET /tasks/:id/files/:fileId/content` → the file's bytes (`Content-Disposition: attachment`). 404 for name-only files. Fetch with the auth header and save the blob (`apiClient.download` + `saveBlob`).
### `DELETE /tasks/:id/files/:fileId` → `Task` (its content is removed too)

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
  "files": [{ "id": "uuid", "name": "string", "size": "bytes | null", "contentType": "string | null" }],
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

**Files** (`files[]` on create and patch):
- An entry whose `id` is one of the project's existing file ids is kept; existing files left out are removed. An entry with any other id is added as a name-only file. Omit `files` to leave them untouched.
- The project form sends only the existing files in `files`, then uploads each newly picked file with `POST /projects/:id/files` (`features/projects/api.js`). If an upload fails after the project saved, the error says so and the list still refreshes.

### `DELETE /projects/:id` — 204; 409 if it still has tasks you can see. Other people's private drafts don't block deletion and are removed with the project.
### `POST /projects/:id/files` — **multipart**, the file in the `file` part → `Project` (max 10 MB). Also accepts JSON `{ name }` (name-only). **Admin-only.**
### `GET /projects/:id/files/:fileId/content` → the file's bytes; anyone who can see the project. 404 for name-only files.
### `DELETE /projects/:id/files/:fileId` → `Project`. **Admin-only.**

**Project shape** — `start`/`end` are **ISO** (`"2026-09-01"`); frontend converts for display at the API boundary (`src/features/projects/api.js`, keeping `startISO`/`endISO`):
```json
{
  "id": "uuid", "name": "string", "departments": ["string"], "leads": ["string"],
  "status": "Active | Overdue | Planning", "trackingMode": "Auto | Manual",
  "start": "YYYY-MM-DD | null", "end": "YYYY-MM-DD | null",
  "createdAt": "ISO 8601", "tasks": 12, "completed": 9, "archived": false,
  "description": "string | null",
  "workflowStages": [{ "id": "uuid", "name": "To Do", "isDefault": true, "progressPercentage": 0, "displayOrder": 0 }],
  "sprintsEnabled": true, "files": [{ "id": "uuid", "name": "string", "size": "bytes | null", "contentType": "string | null" }],
  "accessLevel": "Full Access | Restricted | Private"
}
```

---

## Members

### `GET /members` → `Member[]`
### `POST /members/invite` — `{ name, email, title, department }` → new `Member`, `role: "User"`, `status: "Pending"`. `department` must match an existing department name. 409 if the email or name is taken. Sends the activation email when mail is configured on the server (`MAIL_*` env vars).
### `PATCH /members/:id` — partial merge-patch → `Member`, any of `{ fullName, title, role, status, department }`
- `department`: a department name moves someone, `""` removes them from their department, omitted **or unchanged** leaves it (so saving the form doesn't drop other memberships, e.g. from leading a department).
- `status`: `Active` reactivates a suspended member. A Pending invitee can't be set Active (409) — they become Active by activating; the edit dialog offers Pending/Suspended for them.
- A member who belongs to several departments (leading one also adds you to it) shows the alphabetically first one as `department`.
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
### `PATCH /departments/:id` — partial merge-patch → `Department`; 409 if renamed to an existing name. The UI picks the lead from the member list.
### `DELETE /departments/:id` — 204; 409 if it still has members (reassign them via `PATCH /members/:id` first) or is linked to any projects, by design.

**Department shape:** `{ id, name, lead: string | null, members: number, people: string[] }`

---

## Sprints

Sprints tied to a project you can't see are hidden.

### `GET /sprints` → `Sprint[]`
### `POST /sprints` — `{ name, goal, status?, start?, end? }` → new `Sprint`. `status` defaults to `"Planning"`; dates are `"YYYY-MM-DD"`, `null`/`""` = no date.
### `PATCH /sprints/:id` — partial merge-patch → `Sprint`, any of `{ name, goal, start, end, status }`
- `status` is `Planning`/`Active`/`Completed`; invalid values return 400.
- `start`/`end`: omitted/`null` leaves the date, `""` clears it. An end before the start → 400.
### `DELETE /sprints/:id` — 204; disbands the sprint and returns its tasks to the backlog
### `POST /sprints/:sprintId/tasks/:taskId` / `DELETE` same path — add/remove an existing task (not used by the UI yet)

**Sprint shape:** `{ id, name, goal, status: "Planning | Active | Completed", start: "YYYY-MM-DD | null", end: "YYYY-MM-DD | null", tasks: number, done: number, velocity: number | null }`
- `velocity` = done tasks per week since the sprint started (counted to today, or to the end date once it's over), one decimal. There are no story points, so tasks are the unit. `null` until the sprint has a start date.

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
### `GET /forms/responses/mine` → `Response[]` — the caller's own responses to forms of their current workspace ("My responses" tab).

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

### `GET /meetings` → `Meeting[]` (sorted by `date` ascending; includes past meetings — the Home "Meetings Overview" shows only today onward)
### `POST /meetings` — `{ title, date, time, attendees[] }` → new `Meeting`
### `PATCH /meetings/:id` — partial merge-patch, any of `{ title, date, time, attendees }`. `attendees` replaces the list; omit it to leave attendees untouched. Admin-only.
### `DELETE /meetings/:id` — 204. Admin-only.
Attendees are member names; an unknown name → 404 `"No user found with name: X"`. Names are saved in the member's own spelling.

**Meeting shape:** `{ id, title, date: "YYYY-MM-DD", time: "string", attendees: string[] }`

---

## Email notifications

Sent when the recipient is Active and has `emailNotifications: true` (Settings → "Email me about task and project updates"), never to the person who made the change, and never for private drafts:
- **Assigned to a task** — on task create, `POST /tasks/:id/assignees`, or when a draft is published.
- **Task status changed** — to the task's assignees.
- **New comment** — to the task's assignees.
- **Made a project lead** — on project create, or when added as a lead on edit.

Emails go out in the background — a mail failure is logged and never fails the request. They contain a link to `<FRONTEND_URL>/#task-<uuid>` (task emails). With `MAIL_ENABLED=false` they're only logged.

## Still outstanding

- No pagination on any list endpoint.

## Decided, not building

- **Department-project unlink endpoint** — a department linked to a project can't be deleted (409) and there's no way to unlink it short of deleting the project. Decided this is acceptable behavior, not a gap — a department tied to a real project shouldn't be casually deletable anyway.
