# Alumni Tracer & Donation Management — Backend API

A complete REST API backend for the **Asian College – Dumaguete Campus** Alumni Tracer
and Donation Management System (the React frontend from `Alumni-Final-demo-main`).

This replaces the hardcoded mock data that used to live in `AuthContext.tsx`,
`DonationContext.tsx`, `EventsContext.tsx`, `JobBoardContext.tsx`, and
`NotificationContext.tsx` with a real, persistent database and API.

## Architecture

Plain Node.js (`node:http`, no Express) for the server, with **Postgres via
Supabase** for the database, and `node:crypto` for password hashing (scrypt)
and signed session tokens (HMAC-SHA256, JWT-like). The only external
dependency is the `pg` package (the standard Postgres driver for Node) — run
`npm install` once before starting.

## Requirements

- Node.js 18 or later
- A Supabase project (free tier is fine) — https://supabase.com

## Setting up Supabase

1. Create a project at https://supabase.com (free tier).
2. Go to **Project Settings → Database → Connection string → URI** and copy it.
3. Copy `.env.example` to `.env` and paste that connection string in as
   `DATABASE_URL`, filling in your actual database password (Supabase shows
   a placeholder `[YOUR-PASSWORD]` in the copied string — replace it with
   the password you set when creating the project).
4. Generate a real `AUTH_SECRET` (a command to do this is in `.env.example`)
   and set it too.
5. This app reads environment variables directly from `process.env` — it
   does not load `.env` files itself. For local development, either export
   the variables in your shell before running commands, or install
   `dotenv` yourself and add `require('dotenv').config()` to the top of
   `server.js`/`seed.js`. For deployment (Render, Railway, etc.), set these
   as environment variables in that platform's dashboard instead — that's
   the normal way to do it and needs no `.env` file at all.

## Running it

```bash
npm install       # installs the pg (Postgres) driver
node seed.js       # one-time: creates tables in Supabase and adds demo data
node server.js     # starts the API on http://localhost:4000
```

Or with npm scripts:
```bash
npm run seed
npm start
# npm run dev   # auto-restarts on file changes
```

`seed.js` is safe to re-run — it checks for existing rows before inserting,
so running it again won't duplicate demo data. To fully reset, drop the
tables from Supabase's Table Editor (or run `DROP TABLE ...` in Supabase's
SQL editor) and re-run `node seed.js`.

## Demo accounts (seeded)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@asiancollege.edu` | `admin123` |
| Alumni | `alumni@asiancollege.edu` | `alumni123` |
| Batch Representative | `rep@asiancollege.edu` | `rep123` |
| Faculty | `faculty@asiancollege.edu` | `faculty123` |

## Auth model

- `POST /api/auth/login` returns a bearer token. Send it as `Authorization: Bearer <token>`
  on every subsequent request. Tokens expire after 12 hours.
- `POST /api/auth/register` does **not** log the person in immediately — it creates a
  `pending_registrations` row. An admin must call `POST /api/pending-registrations/:id/approve`
  before the person can log in. This matches the admin "Pending Registrations" page
  already in the frontend.
- Passwords are hashed with scrypt (salted, never stored in plain text).

## API reference

All endpoints are prefixed `/api`. Request/response bodies are JSON.

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | — | `{email,password}` → `{token,user}` |
| POST | `/auth/register` | — | Submits a pending alumni registration |
| GET | `/auth/me` | any | Current user |
| POST | `/auth/logout` | — | No-op (stateless tokens; discard client-side) |

### Users (admin)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users?role=&department=&status=` | admin | List/filter accounts |
| POST | `/users` | admin | Create an account directly (e.g. faculty) |
| GET | `/users/:id` | self or admin | Get one account |
| PUT | `/users/:id` | self or admin | Update (role/status admin-only) |
| DELETE | `/users/:id` | admin | Deactivate account |

### Pending registrations
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/pending-registrations` | admin, representative | List (reps see only their batch/dept) |
| POST | `/pending-registrations/:id/batch-verify` | representative, admin | Mark batch-verified |
| POST | `/pending-registrations/:id/approve` | admin | Approve → creates a real user account |
| POST | `/pending-registrations/:id/reject` | admin | `{reason}` |

### Alumni directory & profile
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/alumni?department=&program=&batchYear=&employmentStatus=` | any | Directory (reps scoped to their batch) |
| GET | `/alumni/me` | alumni | Own profile |
| PUT | `/alumni/me` | alumni | Update own profile/employment info |
| PUT | `/alumni/:id` | admin | Admin edits any alumni record |

### Departments
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/departments` | any | List with live alumni counts |
| POST | `/departments` | admin | Create |
| PUT | `/departments/:id` | admin | Update |
| DELETE | `/departments/:id` | admin | Delete |

### Batch representatives
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/representatives` | admin | List |
| POST | `/representatives` | admin | `{userId,batchYear,department,program}` — promotes an existing alumni user |
| PUT | `/representatives/:id` | admin | Update status |
| DELETE | `/representatives/:id` | admin | Remove (demotes user back to alumni) |

### Campaigns & donations
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/campaigns` | any | List |
| POST | `/campaigns` | admin | Create |
| PUT | `/campaigns/:id` | admin | Update |
| GET | `/donations?status=&campaign=&department=` | any | Alumni see only their own; reps scoped to dept |
| POST | `/donations` | alumni | Submit a donation (Cash requires `amount>0`) |
| PUT | `/donations/:id/verify` | admin, representative | Verify — updates campaign total, notifies donor |
| PUT | `/donations/:id/reject` | admin, representative | `{reason}` |

### Events
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/events` | any | List |
| POST | `/events` | admin, faculty | Create — notifies target department |
| PUT | `/events/:id` | admin, faculty | Update |
| DELETE | `/events/:id` | admin, faculty | Delete |
| POST | `/events/:id/register` | any | Register attendance (capacity-checked) |

### Announcements
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/announcements` | any | List (pinned first) |
| POST | `/announcements` | admin | Create |
| PUT | `/announcements/:id` | admin | Update |
| DELETE | `/announcements/:id` | admin | Delete |

### Job board
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/jobs?status=&department=` | any | List |
| POST | `/jobs` | any | Admin/faculty posts go live immediately; alumni suggestions go to `Pending` |
| PUT | `/jobs/:id` | admin, faculty | Update |
| POST | `/jobs/:id/approve` | admin, faculty | Approve a suggested posting |
| POST | `/jobs/:id/close` | admin, faculty | Close a posting |

### Tracer surveys
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/surveys` | any | Alumni see only `Active` surveys |
| POST | `/surveys` | admin, faculty | Create (with a `questions` array) |
| PUT | `/surveys/:id` | admin, faculty | Update / publish (`status:"Active"` notifies alumni) |
| GET | `/surveys/:id/responses` | admin, faculty | View responses |
| POST | `/surveys/:id/responses` | alumni | Submit a response (one per survey; updates profile employment fields) |

### Notifications
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | any | Scoped to the caller's role/department/user |
| POST | `/notifications` | admin | Broadcast `{title,message,type,targetRole,targetDept}` |
| PUT | `/notifications/:id/read` | any | Mark one read |
| PUT | `/notifications/read-all` | any | Mark all (in scope) read |

### Audit logs & reports
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/audit-logs?severity=&module=` | admin | Last 500 events |
| GET | `/reports/overview` | admin, faculty | Dashboard headline stats |
| GET | `/reports/population` | admin, faculty | Alumni counts by department/batch/employment |
| GET | `/reports/donations` | admin, faculty | Donation totals by campaign/department/status |

### System settings
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/settings` | admin | Key-value settings store |
| PUT | `/settings` | admin | Upsert any keys, e.g. `{"siteName":"Asian College Alumni Portal"}` |

Every write action that matters (login, verify/reject donation, approve registration,
create event, etc.) is recorded in `audit_logs` automatically.

## Connecting the React frontend

The frontend currently keeps all state in React Context (`AuthContext.tsx`,
`DonationContext.tsx`, etc.) using `useState` with hardcoded initial arrays. To wire it
to this API, each context's mock functions get replaced with `fetch` calls, for example:

```tsx
// AuthContext.tsx — replacing the mock login with a real API call
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const login = async (email: string, password: string): Promise<boolean> => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return false;
  const { token, user } = await res.json();
  localStorage.setItem('auth_token', token);
  setUser(user);
  return true;
};
```

Every other context follows the same pattern: swap the `useState` mock array for a
`useEffect` that fetches from the matching endpoint above, and swap each mutator
function (`submitDonation`, `addEvent`, `addJob`, etc.) for a `fetch` POST/PUT call to
the matching route, attaching `Authorization: Bearer <token>` from `localStorage`.

I can do this full rewiring for you — updating `AuthContext.tsx`,
`DonationContext.tsx`, `EventsContext.tsx`, `JobBoardContext.tsx`, and
`NotificationContext.tsx` to call this API instead of using mock arrays — just say the
word and I'll go through the frontend file by file.

## Project structure

```
backend/
├── server.js       # HTTP server + every route
├── db.js           # Postgres (Supabase) connection + schema
├── auth.js         # password hashing + bearer token sign/verify
├── router.js       # tiny dependency-free HTTP router
├── seed.js         # populates demo accounts + sample data
├── package.json
└── .env.example    # DATABASE_URL / AUTH_SECRET reference
```
