# Deploying the demo (Supabase + Render + Vercel)

This gets you a public link people can click and try. Three services, all
free tier, about 20-25 minutes total.

## Step 1 — Create your Supabase project (the database)

1. Go to https://supabase.com, sign up, click **New Project**.
2. Pick an organization, name the project, set a database password
   (write this down — you'll need it in a moment), pick a region close to
   you, and create it. Wait a minute or two for it to provision.
3. Once it's ready: **Project Settings** (gear icon) → **Database** →
   **Connection string** → select **URI**. Copy it — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` in that copied string with the actual database
   password you set in step 2. Save this full string somewhere — it's your
   `DATABASE_URL` for the next step.

## Step 2 — Push this code to GitHub

This folder is already a git repo with everything committed — you just need
to create an empty GitHub repo and push.

1. Go to https://github.com/new, create a new repository. **Don't** check
   any "initialize with README" options — it needs to start empty.
2. Copy the repo URL GitHub shows you.
3. In a terminal, inside this `final_delivery` folder:
   ```bash
   git remote add origin <paste-the-url-here>
   git push -u origin main
   ```
**No git installed / prefer a GUI?** Use GitHub Desktop
(https://desktop.github.com): File → Add Local Repository → select this
`final_delivery` folder → Publish Repository.

## Step 3 — Deploy the backend to Render

1. Go to https://render.com, sign up (no card required for free tier).
2. **New +** → **Web Service** → connect your GitHub repo.
3. Configure:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node seed.js && node server.js`
     (running seed.js first means every restart safely re-checks the demo
     accounts exist — it's idempotent, so it won't duplicate data if
     they're already there, which they will be since Supabase persists
     between restarts)
   - **Instance Type:** Free
4. Add two environment variables:
   - `DATABASE_URL` = the connection string from Step 1
   - `AUTH_SECRET` = any long random string (generate one with
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
     if you have Node locally, or use https://1password.com/password-generator/)
5. Click **Create Web Service**. Wait for it to deploy — Render gives you a
   URL like `https://your-app-name.onrender.com`.
6. Test it: visit `https://your-app-name.onrender.com/api/health` in a
   browser. You should see `{"status":"ok",...}`.
7. Check Supabase: go back to your Supabase project → **Table Editor** in
   the sidebar. You should see tables like `users`, `donations`,
   `campaigns`, etc., and the `users` table should have 4 rows (the seeded
   demo accounts). If you see this, the database connection is confirmed
   working.

**Free tier note:** Render's free web services spin down after ~15 minutes
of no traffic; the next request wakes it back up (~30-60 seconds, one-time
delay). Unlike the old SQLite setup, this does **not** lose any data —
Supabase's database keeps running independently of your backend service.

## Step 4 — Deploy the frontend to Vercel

1. Go to https://vercel.com, sign up (no card required).
2. **Add New** → **Project** → import the same GitHub repo.
3. On the configuration screen:
   - **Root Directory:** click Edit, select `frontend`
   - Framework Preset should auto-detect as **Vite**
   - Build command: `npm run build` (should be auto-filled)
   - Output directory: `dist` (should be auto-filled)
4. Before deploying, expand **Environment Variables** and add:
   - **Key:** `VITE_API_URL`
   - **Value:** your Render backend URL from Step 3, plus `/api` —
     e.g. `https://your-app-name.onrender.com/api`
5. Click **Deploy**. Vercel gives you a public URL like
   `https://your-app-name.vercel.app` — that's the link you share.

## Step 5 — Try it

Open your Vercel link and log in with any seeded demo account (see the main
README). If login fails, the most common cause is `VITE_API_URL` being
wrong or missing the trailing `/api` — check it in Vercel's project
settings → Environment Variables, and redeploy after fixing it (env var
changes require a redeploy to take effect: Vercel's Deployments tab →
latest deployment → the "..." menu → Redeploy).

## Updating the demo later

Any `git push` to your repo auto-redeploys both Vercel and Render.
