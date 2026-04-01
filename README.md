# TeamTask — Setup Guide

## What you need installed first

- Node.js (you already have this ✓)
- PostgreSQL (download from https://www.postgresql.org/download/windows)

---

## Step 1 — Set up PostgreSQL

1. Install PostgreSQL and remember your password
2. Open pgAdmin → right-click Databases → Create → Database
3. Name it: **teamtask**

---

## Step 2 — Configure the backend

Open `backend/.env` and update this line with your PostgreSQL password:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/teamtask"
```

---

## Step 3 — Install & run the backend

Open a terminal in the `backend` folder:

### First time only:

```bash
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### Every time after (just run):

```bash
npm run dev
```

You should see: ✓ Server running on http://localhost:5000

---

## Swagger API Docs

After the backend is running, open:

**http://localhost:5000/api-docs**

If Swagger dependencies are not installed yet, run this inside `backend`:

```bash
npm install swagger-ui-express swagger-jsdoc
```

### How to authorize in Swagger

1. Open `POST /api/auth/login`
2. Click `Try it out`
3. Send your email and password
4. Copy the `token` from the response
5. Click the `Authorize` button in Swagger
6. Paste the token into the bearerAuth field
7. Click `Authorize`

After that, protected endpoints like `/api/users`, `/api/tasks`, and `/api/projects` can be tested from Swagger.

---

## Step 4 — Install & run the frontend

Open a SECOND terminal in the `frontend` folder:

### First time only:

```bash
npm install
npm run dev
```

### Every time after (just run):

```bash
npm run dev
```

You should see: Local: http://localhost:5173

---

## Step 5 — Open the app

Go to: **http://localhost:5173**

---

## Step 6 — Login with seeded users

After running `npm run seed`, you can sign in at http://localhost:5173 with:

- CEO: `ceo@teamtask.com` / `admin123`
- Manager: `manager@teamtask.com` / `admin123`
- Employee: `employee1@teamtask.com` / `admin123`
- Client: `client@teamtask.com` / `admin123`

---

## Folder structure

```
teamtask/
├── backend/
│   ├── prisma/schema.prisma   ← Database structure
│   ├── routes/                ← API endpoints
│   ├── middleware/auth.js     ← JWT protection
│   ├── server.js              ← Entry point
│   └── .env                   ← Your config (edit this!)
└── frontend/
    ├── src/
    │   ├── pages/             ← All screens
    │   ├── components/        ← Reusable UI parts
    │   └── api/client.js      ← API connection
    └── package.json
```

---

## Troubleshooting: Login Issues

If you see a "Login failed" error even after seeding the database:

- Make sure your frontend is correctly proxying API requests to your backend.
- By default, the Vite config (frontend/vite.config.js) should have:

```js
proxy: {
  '/api': 'http://localhost:5000' // Forward API calls to backend
}
```

- If it was set to a network IP (e.g., 'http://192.168.1.251:5000'), change it to 'http://localhost:5000' for local development.
- After making this change, restart your frontend server.

This ensures your frontend can communicate with your backend and resolves most local login issues.

Redesign the GUI/UX for my web app called TeamTask.

This is a role-based team task management platform for organizations. It now supports **4 roles**:

1. CEO
2. Manager
3. Employee
4. Client _(NEW!)_

## Key Features (2026 Update)

- **Client Portal:** Clients can request tasks, track project progress, and rate completed work.
- **Project Management:** Create and manage projects, link tasks to projects, assign clients and managers.
- **Task Ratings:** Clients can rate completed tasks (1-5 stars + comment).
- **Approval Workflow:** CEO/Managers approve or reject work, with comments and notifications.
- **Evidence Upload:** Employees upload photo/video as proof before marking tasks complete.
- **Enhanced Notifications:** Real-time updates for task status, approvals, points, deadlines, and level-ups.
- **User Performance:** Stars, levels, points, on-time rates, and detailed stats for all roles.
- **Section Management:** Organize teams, assign managers/employees to sections.
- **Multi-language Support:** English & Arabic UI (auto-detect or user-selectable).
- **Modern UI/UX:** Redesigned dashboards, cleaner forms, improved hierarchy, mobile responsiveness, and premium look.

## Main Pages

- Login
- CEO Dashboard
- Manager Dashboard
- Employee Dashboard
- Client Dashboard _(NEW)_
- Projects page _(NEW)_
- Tasks list page
- Task detail page
- Create task page
- Sections management page
- Users management page
- Profile page
- Notifications page

## Important Workflows

- **Client requests work:** Clients submit task requests with requirements and deadlines.
- **CEO approves/rejects requests:** CEO reviews and manages client requests.
- **Project assignment:** CEO assigns projects/tasks to managers; managers create subtasks for employees.
- **Evidence & Approval:** Employees upload evidence; managers/CEO approve or request changes.
- **Task rating:** Clients rate completed tasks; ratings are visible to the team.
- **Performance tracking:** All users see points, stars, levels, and progress stats.

## New & Improved Design

- Modern, premium dashboard UI (dark navy, glass-effect cards, blue/teal highlights)
- Improved visual hierarchy and reduced clutter
- Responsive layouts for all devices
- Cleaner forms and tables
- Enhanced notifications and empty states
- Multi-language support (English/Arabic)

## New API & Database Changes

- Added Client and Rating models (Prisma)
- Projects module and endpoints
- Extended Task model: clientId, requestStatus, clientNotes, rating
- New endpoints for client management, ratings, and project workflows

---

For a full feature list and roadmap, see `PROJECT_OVERVIEW.md` and `FUTURE_WORK.md`.
