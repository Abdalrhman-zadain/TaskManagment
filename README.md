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

This is a role-based team task management platform for organizations. It has 3 roles:

1. CEO
2. Manager
3. Employee

Core purpose:

- Manage teams and sections
- Assign tasks from CEO to managers
- Assign subtasks from managers to employees
- Track progress and deadlines
- Upload evidence (photo/video) before marking a task complete
- Approve or reject completed work
- Score completed tasks out of 10
- Show user performance, stars, levels, and notifications

Main pages:

- Login
- CEO Dashboard
- Manager Dashboard
- Employee Dashboard
- Tasks list page
- Task detail page
- Create task page
- Sections management page
- Users management page
- Profile page
- Notifications page

Important workflows:

- CEO creates sections and assigns managers
- CEO assigns main tasks to managers
- Managers assign subtasks to employees in their own section
- Employees upload evidence and submit for approval
- Managers/CEO approve or reject work
- Users receive points, stars, and level progression based on performance

Current design:

- Dark navy dashboard UI
- Left sidebar navigation
- Glass-effect cards
- Blue/teal highlights
- Many cards, stats, badges, and task rows

Problems to solve:

- Make it look more modern and premium
- Improve visual hierarchy
- Reduce clutter and make information easier to scan
- Improve dashboard layouts
- Improve task detail page UX
- Make forms cleaner and more user-friendly
- Improve mobile responsiveness
- Keep it professional for company use

Please give me:

- A full UI/UX redesign direction
- Color palette
- Typography suggestions
- Dashboard layout ideas for each role
- Better component ideas for tasks, stats, notifications, profile, and forms
- Suggestions for spacing, icons, cards, tables, filters, and empty states
- A cleaner and more modern design system
