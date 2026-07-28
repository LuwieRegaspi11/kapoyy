# Asian College Alumni Tracer & Donation Management System

A full-stack web application: a React/Vite frontend and a Node.js backend
backed by **Postgres via Supabase**, wired together end to end. See
`backend/README.md` for the full API reference and Supabase setup steps.

## Quick start (local)

You need two terminals — one for the backend, one for the frontend — plus a
free Supabase project (see `backend/README.md` → "Setting up Supabase").

**Terminal 1 — backend:**
```bash
cd backend
npm install
# set DATABASE_URL and AUTH_SECRET — see backend/.env.example
node seed.js     # one-time: creates tables in Supabase and adds demo data
node server.js   # starts the API on http://localhost:4000
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm install
npm run dev      # starts the app on http://localhost:5173
```

Open http://localhost:5173 and log in with any of the seeded demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@asiancollege.edu` | `admin123` |
| Alumni | `alumni@asiancollege.edu` | `alumni123` |
| Batch Representative | `rep@asiancollege.edu` | `rep123` |
| Faculty | `faculty@asiancollege.edu` | `faculty123` |

The frontend talks to the backend at `http://localhost:4000/api` by default.
To point it elsewhere (e.g. after deploying), copy `frontend/.env.example` to
`frontend/.env` and change `VITE_API_URL`.

## Donation payment flow (manual transfer + verification model)

This system intentionally does **not** integrate a live e-payment gateway,
e-wallet API, or bank-to-bank transfer API. Instead it implements the
complete manual-transfer-and-verify flow used by most Philippine alumni
associations:

1. Admin configures real GCash and bank account details once, in
   **Admin → System Settings → Payment Config**. Both are saved and stored,
   but only GCash is currently shown to donors (see note below).
2. Alumni open **Donations → Make a Donation**, pick a campaign and amount,
   see the admin's real GCash number (copy-to-clipboard included), send the
   money manually via their own GCash app, then upload a screenshot/receipt
   as proof.
3. The donation is created with status `Pending` and a reference number
   (e.g. `DON-MRYJD8M7`) is shown to the donor immediately.
4. Admin or the alumni's batch representative reviews the proof image in
   **Donation Management** and clicks Verify or Reject (with a reason).
5. On verify: the campaign's raised total updates immediately, the donor
   gets a notification, and a printable receipt becomes available in their
   donation history (reference number, amount, campaign, verifier, dates).
6. On reject: the donor sees the rejection reason on their donation history
   entry.

**Demo-only note — GCash-only display:** `frontend/src/app/components/alumni/DonationPortal.tsx`
currently shows donors only the GCash payment option. Bank transfer details
are still fully configurable in System Settings and stored in the database,
and the backend `/api/donation-info` endpoint already returns them — the
bank-transfer `<CopyableField>` is just commented out in that file. To
enable it for the real release, open that file, find the comment block
right after the GCash `CopyableField`, and un-comment the bank-transfer
line. No backend or data changes are needed — it's a one-line UI toggle.

## What's wired up

Every page reachable from the app's navigation — across all four roles
(Admin, Alumni, Faculty, Batch Representative) — reads and writes through the
real API and the Postgres database in Supabase. That includes:

- Login / registration (with admin-approval workflow) / session persistence
- Alumni directory, profile editing, employment tracking
- Donations & campaigns, full manual-transfer verification workflow (see above)
- Events, RSVPs (with live registered/not-registered state per user), and
  the admin event-management console (calendar view + management view)
- Job board (staff postings go live immediately; alumni suggestions need approval)
- Tracer surveys — admin/faculty create, publish, and view responses;
  alumni respond
- Announcements, departments, batch representative assignment
- Pending-registration approval and batch verification
- Notifications (polled every 30s)
- Audit logs — admins see everything, batch representatives see their own
  activity trail
- Reports & population analytics, computed from live data
- System settings, including the donation payment info alumni see live

A few files that exist in the codebase but are **not** linked from any
navigation menu were left untouched, since nothing in the app can reach them:
`admin/AlumniDatabase.tsx`, `admin/DonationMonitoring.tsx`,
`alumni/AlumniProfile.tsx`, `faculty/FacultyTracerView.tsx`. They're safe to
delete or ignore — the routed equivalents (`AlumniManagement.tsx`,
`DonationManagement.tsx`, `ProfilePage.tsx`, `TracerSurveys.tsx`) are the
ones actually wired and in use.

## Backend verification

The backend was migrated from an earlier SQLite version to Postgres/Supabase.
Since the assistant that built this has no network access to a live
Supabase instance, verification was done with a local test harness: a
stand-in Postgres driver (matching the real `pg` package's documented
`Pool.query()` interface exactly — same `$1,$2` placeholders, same
`{rows, rowCount}` return shape) backed by SQLite, so the *unmodified*
production code could actually be run and exercised. The same 76-check
automated test suite used for the original SQLite version — covering every
endpoint, every role, every permission boundary, and edge cases like
duplicate submissions and zero-amount donations — was re-run against this
harness and **all 76 passed** after two real bugs were found and fixed
during the migration:

1. Several places read a query result's field directly off an unresolved
   Promise (`await x.get(id).c` instead of `(await x.get(id)).c`) — a
   JavaScript operator-precedence trap that would have silently broken
   the admin Reports Overview page and thrown an error on event
   registration checks. Found via automated grep-based detection and
   fixed in 9 places.
2. `user` is a reserved word in Postgres — the audit-log table's `user`
   column was renamed to `user_name` to avoid a guaranteed syntax error
   on table creation (the API's JSON output field name is unchanged, so
   this doesn't affect the frontend).

**What this does and doesn't prove:** it proves the application logic —
every one of the ~150 database calls, permission checks, and business
rules — behaves correctly when driven through an async, Postgres-shaped
interface. It does not prove the live network connection to your specific
Supabase project works, since that depends on your connection string,
network, and Supabase's actual server — that part needs to be verified by
you once deployed, by running `node seed.js` and checking Supabase's Table
Editor for the seeded rows.

## Deploying (Render + Vercel + Supabase)

- **Database** — Supabase (see `backend/README.md` for setup).
- **Backend** — any host that runs a persistent Node process. Render's free
  tier works for a demo. Start command: `node server.js`. Set `DATABASE_URL`
  (from Supabase) and `AUTH_SECRET` (a real random string) as environment
  variables.
- **Frontend** — Vercel. Root directory `frontend`, framework preset Vite
  (auto-detected), build command `npm run build`, output directory `dist`.
  A `vercel.json` is already included in `frontend/` with the SPA rewrite
  rule this app needs (it uses React Router's `BrowserRouter`, so without
  it, refreshing any inner page like `/alumni/donations` would 404). Set
  `VITE_API_URL` to your deployed backend's URL + `/api`.

**Data persistence note:** unlike the earlier SQLite version, Supabase's
Postgres database is a genuinely persistent, managed database — it does
not reset when your backend service restarts or redeploys. This was the
main reason to migrate off SQLite for anything beyond a quick local demo.

## Known limitations

- PDF/Excel export buttons (alumni database export, reports "Generate PDF" /
  "Generate Letters") are UI-only — they aren't wired to a document-generation
  backend. Everything else on those pages is live.
- No live payment gateway integration (see above — this is by design).
- Bank transfer is configured but hidden from the donor UI for this demo
  (see the note above for how to re-enable it).
- The frontend was verified by careful manual tracing and a TypeScript parse
  check on every edited file, plus a full backend endpoint test suite. No
  `npm install`/`npm run build` was possible in the environment this was
  built in (no network access) — run it yourself as a final check, and
  click through the app once before sharing a link widely.
- The backend was verified via the local test harness described above, not
  a live Supabase connection. Run `node seed.js` against your real
  Supabase project and check the Table Editor before considering it fully
  confirmed.

## Project structure

```
final_delivery/
├── backend/    # Node.js API + Postgres/Supabase (see backend/README.md)
└── frontend/   # React + Vite + TypeScript app
```
