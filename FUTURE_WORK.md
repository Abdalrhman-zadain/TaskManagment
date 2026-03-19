# 🚀 Future Work & Feature Roadmap

## Phase 2: Client Management System

### Overview

Add a **Client** role to the system. Clients can request tasks, track progress, and rate completed work.

### New Architecture

```
CLIENT (New) - External users requesting work
  ├── Can create/request tasks
  ├── Can view their assigned tasks
  ├── Can rate completed work
  └── Can request revisions

CEO - Approves task requests
  ├── Reviews client requests
  ├── Assigns tasks to Managers
  └── Manages client relationships

MANAGER - Executes work
  ├── Creates subtasks for Employees
  └── Does assigned work

EMPLOYEE - Does subtasks
  ├── Does detailed work
  └── Submits evidence
```

---

## Database Changes

### New Table: `Client`

```sql
model Client {
  id              Int       @id @default(autoincrement())
  name            String    // Company/Organization name
  email           String    @unique
  password        String    // hashed with bcryptjs
  phoneNumber     String?
  address         String?
  website         String?
  industry        String?   // e.g., "Tech", "Marketing", "E-commerce"
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  tasks           Task[]    // Relation to tasks they requested
  ratings         Rating[]  // Relation to ratings they gave
}

model Rating {
  id              Int       @id @default(autoincrement())
  score           Int       // 1-5 stars
  comment         String?
  clientId        Int
  taskId          Int
  createdAt       DateTime  @default(now())
  client          Client    @relation(fields: [clientId], references: [id])
  task            Task      @relation(fields: [taskId], references: [id])
}
```

### Updated: `Task` table

```sql
model Task {
  ...existing fields...
  clientId        Int?      // Optional - null for internal CEO tasks
  requestStatus   String    @default("PENDING") // PENDING, APPROVED, COMPLETED, CANCELLED
  clientNotes     String?   // Why client needs this + requirements
  client          Client?   @relation(fields: [clientId], references: [id])
  rating          Rating?   // Client rating after completion
}
```

---

## Implementation Stages

### ✅ Stage 1: Foundation (Priority: HIGH)

- [ ] Create `Client` and `Rating` tables
- [ ] Add `clientId`, `requestStatus`, `clientNotes` to Task
- [ ] Database migration
- [ ] Extend seed data with test clients
- [ ] Role enum: add `CLIENT` role
- [ ] Client login/register page
- [ ] Client dashboard (view-only: my tasks)
- [ ] Client task request form
- [ ] Update auth middleware to handle CLIENT role

### ⏳ Stage 2: Business Logic (Priority: MEDIUM)

- [ ] CEO: Approve/Reject client requests
- [ ] CEO: Dashboard showing pending requests
- [ ] Task detail: Show if task is from external client
- [ ] Client: Rate completed tasks (1-5 stars + comment)
- [ ] Client: View ratings of their completed tasks
- [ ] Email notifications to client (task approved, in progress, completed)
- [ ] Client: Request revisions (send task back)

### 📱 Stage 3: Advanced Features (Priority: LOW)

- [ ] Client: Upload files/attachments with requests
- [ ] Client: Create recurring task templates
- [ ] Admin: Client management panel (create/edit/delete)
- [ ] Reporting: Client invoice generation
- [ ] Client: Analytics dashboard (tasks completed, avg rating, etc.)
- [ ] Payment integration (if needed)
- [ ] Client portal branding customization

---

## File Structure Changes

```
backend/
├── routes/
│   ├── ...existing...
│   └── clients.js         ← NEW: Client CRUD endpoints
├── prisma/
│   └── schema.prisma      ← UPDATE: Add Client & Rating models
└── utils/
    └── ...existing...

frontend/
├── pages/
│   ├── ...existing...
│   ├── ClientDashboard.jsx      ← NEW: Client view my tasks
│   ├── ClientRequestForm.jsx    ← NEW: Client request task
│   └── ClientRating.jsx         ← NEW: Rate completed tasks
└── components/
    └── ...existing...
```

---

## API Endpoints (New)

### Client Authentication

```
POST   /auth/register-client      Create new client account
POST   /auth/login-client         Client login (reuse existing)
```

### Client Management (CEO only)

```
GET    /clients                   List all clients
POST   /clients                   Create client (admin)
GET    /clients/:id               Client details
PATCH  /clients/:id               Update client
DELETE /clients/:id               Delete client
```

### Client Requests

```
POST   /tasks/request             Client submits task request
GET    /tasks/my-requests         Client: my requests
PATCH  /tasks/:id/request-status  CEO: approve/reject request
```

### Client Ratings

```
POST   /ratings                   Client rates completed task
GET    /tasks/:id/ratings         Get ratings for task
GET    /clients/:id/ratings       Get all ratings client gave
```

---

## Frontend Pages (New)

### 1. **Client Dashboard** (`/client/dashboard`)

- See all requested tasks with status
- Filter by: status, date, priority
- Quick actions: view details, rate if completed

### 2. **Request Task Form** (`/client/request`)

- Form fields:
  - Task title
  - Description
  - Required deadline
  - Budget/Priority level
  - Attachments
  - Special requirements
- Submit and see confirmation

### 3. **Task Detail** (Updated)

- If task is from client: show client info
- If task is completed: show rating button
- Show client feedback/requirements

### 4. **Rate & Feedback** (Modal)

- Star rating (1-5)
- Comment field
- Option to request revision
- Submit rating

---

## Workflow Example

```
1️⃣ CLIENT REQUEST
   Client → Fills request form
   → Submits task request with deadline & requirements
   → Gets "Request Submitted" confirmation

2️⃣ CEO APPROVAL
   CEO → Sees notification: "New task request from Acme Corp"
   → Reviews client requirements
   → Approves or rejects
   → Client gets email notification

3️⃣ ASSIGNMENT
   CEO → Assigns to Manager
   Manager → Creates subtasks for Employees
   Employee → Works on task + uploads evidence

4️⃣ APPROVAL
   CEO → Reviews + approves work
   Task marked DONE
   Client gets email: "Your task is complete"

5️⃣ RATING
   Client → Clicks "Rate this task"
   → Gives 1-5 stars + comment
   → Rating saved + shown to team
```

---

## Security Considerations

- [ ] CLIENT role has limited access (only their own tasks)
- [ ] CEO must approve all client requests before work starts
- [ ] Clients cannot see each other's tasks
- [ ] Password hashing (bcryptjs) for client accounts
- [ ] JWT token for client sessions (same as others)
- [ ] Rate limiting on request submissions (max 10/day per client)

---

## Testing Checklist

- [ ] Client registration/login works
- [ ] Client can submit task requests
- [ ] CEO can see pending requests
- [ ] CEO can approve/reject
- [ ] Client dashboard shows correct statuses
- [ ] Client can rate completed tasks
- [ ] Ratings visible to CEO/Manager
- [ ] Email notifications sent correctly
- [ ] Role-based access control works

---

## Notes

- Consider building a separate **Client Portal** (different subdomain?) for better UX
- May need to add **Payment/Invoicing** later if charging clients
- **Analytics** dashboard would help clients understand ROI
- Consider **SLA tracking** (task completion time metrics)

---

## Status: 📋 PLANNED

**Not yet started.** Adding after core functionality is stable.

**Estimated effort:** 30-40 hours for full Stage 1-2 implementation
