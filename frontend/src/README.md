# Alumni Tracer and Donation System

A web application for **Asian College – Dumaguete Campus** that manages alumni records,
tracer surveys, donations, events, job postings, and batch representative verification.
Built as a single-page React app with role-based dashboards for Admins, Alumni, Faculty,
and Batch Representatives.

Progressively cleaned up, made responsive, and given working dark mode support.

---

## Running the code

```bash
npm i
npm run dev
```

This starts the Vite development server (default: `http://localhost:5173`).

Other available scripts:

```bash
npm run build   # production build (outputs to dist/)
```

**Requirements:** Node.js 18+ and npm (or pnpm, since a `pnpm-workspace.yaml` is included).

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 6 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 (utility classes + a custom dark-mode override stylesheet) |
| UI primitives | shadcn/ui (Radix UI) components in `src/app/components/ui/` |
| Additional components | MUI (Material UI) — used in several data-heavy admin pages (tables, selects, chips) |
| Charts | Recharts |
| Icons | lucide-react |
| Forms | react-hook-form |

---

## ⚠️ Current state: demo / mock data only

**There is no backend or database connected yet.** All data — alumni records, donations,
events, announcements, job postings, survey responses, and even login accounts — is
hardcoded in-memory mock data defined inside the React components (mainly
`AuthContext.tsx` and the various admin/alumni page components). Nothing persists:
refreshing the page resets everything, and anything you "add" through the UI only
lives in that browser tab's memory.

This is a deliberate, temporary state — the mock data (including the login accounts
below) is intentionally still in place so the app remains usable and demoable while a
real backend/database is selected and wired in.

### Demo login accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@asiancollege.edu` | `admin123` |
| Alumni | `alumni@asiancollege.edu` | `alumni123` |
| Batch Representative | `rep@asiancollege.edu` | `rep123` |
| Faculty | `faculty@asiancollege.edu` | `faculty123` |

New alumni can also self-register through the `/register` page (also stored only in
memory, not persisted).

---

## Project structure

```
src/
├── main.tsx                     # App entry point
├── styles/
│   ├── tailwind.css             # Tailwind entry + custom-variant setup for class-based dark mode
│   └── theme.css                # Global CSS overrides that drive dark mode (html.dark ...)
├── imports/                     # Static image assets (logo, landing page photos)
└── app/
    ├── App.tsx                  # Router setup, role-protected routes, MUI theme bridge
    └── components/
        ├── LandingPage.tsx      # Public marketing/landing page
        ├── AuthPage.tsx         # Combined sign-in / sign-up page (used at /login and /register)
        ├── AuthContext.tsx      # Mock auth provider (login/register/logout, mock user list)
        ├── AdminDashboard.tsx   # Admin shell + routes (see below)
        ├── AlumniDashboard.tsx  # Alumni shell + routes
        ├── UserDashboard.tsx    # Faculty shell + routes
        ├── RepresentativeDashboard.tsx  # Batch Representative shell + routes
        ├── admin/                # Admin-only feature pages
        ├── alumni/                # Alumni-only feature pages
        ├── faculty/               # Faculty-only feature pages
        ├── representative/        # Batch Representative feature pages
        ├── shared/                # Cross-role components (layout, dark mode, notifications,
        │                          # events/donations/job-board contexts, profile page, etc.)
        └── ui/                    # shadcn/ui primitive components (buttons, dialogs, tables, ...)
```

### Roles and routes

The app uses role-based protected routing (`ProtectedRoute` in `App.tsx`). After login,
each role lands on its own dashboard shell with nested routes:

- **`/admin/*`** — Admin: overview, pending registrations, batch representatives,
  population analytics, alumni database, donation management, event management,
  announcements, job board, department management, user accounts, reports, audit logs,
  system settings.
- **`/alumni/*`** — Alumni: profile, tracer survey, donations, events, job board.
- **`/user/*`** — Faculty: tracer survey view, dashboard home.
- **`/representative/*`** — Batch Representative: verification tools for their assigned
  batch/department/program.
- **`/login`, `/register`** — Public auth pages.
- **`/`** — Public landing page.

> **Note:** Two older standalone pages, `LoginPage.tsx` and `RegistrationPage.tsx`, still
> exist in the codebase but are **not wired into any route** — they were superseded by
> the combined `AuthPage.tsx` (which handles both sign-in and sign-up with tab switching).
> They're currently unused dead code left in place pending a decision on whether to
> remove them.

---

## Key features already implemented

- **Dark mode** — toggled from the dashboard header, persisted in `localStorage`,
  applied via a `.dark` class on `<html>`. Driven by a combination of Tailwind's
  `dark:` variant (for shadcn/ui primitives) and a global CSS override stylesheet
  (`src/styles/theme.css`) for everything else, plus an MUI theme bridge
  (`MuiThemeBridge` in `App.tsx`) so MUI components (tables, selects, chips, etc.)
  switch palettes too. Recharts-based analytics charts also adapt their axis/grid/
  tooltip colors.
- **Responsive layout** — dashboard shells collapse to a mobile drawer navigation,
  stat/data grids reflow from multi-column to single-column on narrow screens, and
  the sign-in/sign-up page switches from a desktop split-panel layout to a
  single-column mobile view with tab switching.
- **Role-based access control** — each dashboard route is guarded by role; users are
  redirected to `/unauthorized` if they try to access a route outside their role.

---

## Known limitations / next steps

1. **No real backend.** All data is mock/in-memory. Connecting a real database
   (Supabase, Firebase, or a custom API) is the next major piece of work — this would
   replace the hardcoded arrays in `AuthContext.tsx` and the various feature pages
   with real API calls.
2. **Landing page images are local, but most other imagery (avatars, etc.) is still
   remote** (e.g. `ui-avatars.com` placeholder avatars generated on the fly).
3. **`LoginPage.tsx` and `RegistrationPage.tsx`** are unused/orphaned — safe to delete
   once confirmed unnecessary, since `AuthPage.tsx` fully replaces them.
4. **No automated tests** currently exist in this project.

---

## Attribution

See `ATTRIBUTIONS.md` for third-party library and asset licensing notes.
