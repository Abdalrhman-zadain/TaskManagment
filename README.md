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
