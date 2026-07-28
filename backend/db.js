// db.js — Postgres (Supabase) connection + schema for the Alumni Tracer &
// Donation Management System.
//
// This replaces the original node:sqlite version. It exposes the SAME
// db.prepare(sql).get/all/run(...) shape the rest of the app already uses,
// so server.js and seed.js barely change — the only difference is every
// .get/.all/.run call is now async and must be awaited (Postgres has no
// synchronous driver for Node the way node:sqlite did for SQLite).
'use strict';

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy your connection string from ' +
    'Supabase → Project Settings → Database → Connection string (URI), ' +
    'and set it as the DATABASE_URL environment variable.'
  );
}

const pool = new Pool({
  connectionString,
  // Supabase requires SSL; Node's default TLS trust chain doesn't always
  // include Supabase's cert chain out of the box, so this relaxes strict
  // verification the same way Supabase's own connection examples do.
  ssl: { rejectUnauthorized: false },
});

// Converts SQLite-style "?" placeholders (positional, in order) to
// Postgres-style "$1", "$2", ... placeholders.
function toPgPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

const db = {
  prepare(sql) {
    const pgSql = toPgPlaceholders(sql);
    return {
      async get(...params) {
        const res = await pool.query(pgSql, params);
        return res.rows[0];
      },
      async all(...params) {
        const res = await pool.query(pgSql, params);
        return res.rows;
      },
      async run(...params) {
        const res = await pool.query(pgSql, params);
        return { changes: res.rowCount };
      },
    };
  },
  async exec(sql) {
    await pool.query(sql);
  },
};

const TIMESTAMP_DEFAULT = `to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

async function initSchema() {
  await db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','alumni','faculty','representative')),
  department TEXT,
  program TEXT,
  batch_year INTEGER,
  phone TEXT,
  student_id TEXT,
  graduation_date TEXT,
  employment_status TEXT,
  current_company TEXT,
  position TEXT,
  profile_image TEXT,
  assigned_batch_year INTEGER,
  assigned_department TEXT,
  assigned_program TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Pending','Deactivated')),
  verified INTEGER NOT NULL DEFAULT 0,
  last_login TEXT,
  created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT}
);

CREATE TABLE IF NOT EXISTS pending_registrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  program TEXT,
  student_id TEXT,
  batch_year INTEGER,
  graduation_date TEXT,
  current_employment_status TEXT,
  profile_image TEXT,
  registered_date TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected')),
  is_batch_verified INTEGER NOT NULL DEFAULT 0,
  batch_verified_by TEXT
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  dean TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  programs TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS representatives (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  batch_year INTEGER,
  department TEXT,
  program TEXT,
  assigned_date TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
  verifications_count INTEGER NOT NULL DEFAULT 0,
  profile_image TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Inactive'))
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target REAL NOT NULL DEFAULT 0,
  current REAL NOT NULL DEFAULT 0,
  department TEXT NOT NULL DEFAULT 'All',
  active INTEGER NOT NULL DEFAULT 1,
  deadline TEXT
);

CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
  alumni_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  alumni_name TEXT NOT NULL,
  alumni_email TEXT NOT NULL,
  department TEXT,
  campaign TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK(type IN ('Cash','In-Kind')),
  description TEXT,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Verified','Rejected')),
  submitted_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
  verified_at TEXT,
  verified_by TEXT,
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  time TEXT,
  location TEXT,
  department TEXT NOT NULL DEFAULT 'All',
  created_by TEXT,
  registered_count INTEGER NOT NULL DEFAULT 0,
  max_capacity INTEGER,
  status TEXT NOT NULL DEFAULT 'Upcoming' CHECK(status IN ('Upcoming','Ongoing','Completed')),
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS event_registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registered_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  target_dept TEXT NOT NULL DEFAULT 'All',
  date TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
  pinned INTEGER NOT NULL DEFAULT 0,
  author TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  type TEXT CHECK(type IN ('Full-time','Part-time','Remote','Contract','Internship')),
  department TEXT,
  description TEXT,
  requirements TEXT,
  posted_by TEXT,
  posted_by_role TEXT,
  posted_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
  active INTEGER NOT NULL DEFAULT 1,
  suggested_by TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Pending','Closed'))
);

CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_dept TEXT NOT NULL DEFAULT 'All',
  target_year TEXT NOT NULL DEFAULT 'All',
  questions TEXT NOT NULL DEFAULT '[]',
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_responses INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Active','Closed')),
  created_date TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT}
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id TEXT PRIMARY KEY,
  survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  alumni_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  employment_status TEXT,
  current_company TEXT,
  position TEXT,
  answers TEXT NOT NULL DEFAULT '{}',
  submitted_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
  UNIQUE(survey_id, alumni_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info','success','warning','error')),
  target_role TEXT,
  target_dept TEXT,
  target_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT}
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL DEFAULT ${TIMESTAMP_DEFAULT},
  user_name TEXT,
  role TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  severity TEXT NOT NULL DEFAULT 'Low' CHECK(severity IN ('Low','Medium','High'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
  `);
}

module.exports = db;
module.exports.initSchema = initSchema;
module.exports.pool = pool;
