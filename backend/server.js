// server.js — Alumni Tracer & Donation Management System API.
// Pure Node.js (http + node:sqlite + node:crypto). No external dependencies.
// Run: node server.js   (defaults to http://localhost:4000)
'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const db = require('./db');
const Router = require('./router');
const { hashPassword, verifyPassword, signToken, verifyToken } = require('./auth');

const PORT = process.env.PORT || 4000;
const router = new Router();

// ---------- helpers ----------

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    req.on('data', (c) => { chunks += c; if (chunks.length > 10_000_000) req.destroy(); });
    req.on('end', () => {
      if (!chunks) return resolve({});
      try { resolve(JSON.parse(chunks)); } catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

async function getAuthUser(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return null;
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
  return user || null;
}

async function requireAuth(req, res) {
  const user = await getAuthUser(req);
  if (!user) {
    sendJson(res, 401, { error: 'Unauthorized. Provide a valid Bearer token.' });
    return null;
  }
  return user;
}

async function requireRole(req, res, ...roles) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  if (!roles.includes(user.role)) {
    sendJson(res, 403, { error: `Forbidden. Requires role: ${roles.join(' or ')}.` });
    return null;
  }
  return user;
}

async function logAudit(user, action, module, details, req) {
  await db.prepare(`INSERT INTO audit_logs (id,user_name,role,action,module,details,ip_address,severity)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    genId('log'), user ? user.name : 'System', user ? user.role : 'system',
    action, module, details || '', req?.socket?.remoteAddress || 'unknown',
    /delete|reject|deactivat/i.test(action) ? 'High' : /verify|approve|update/i.test(action) ? 'Medium' : 'Low'
  );
}

async function notify({ title, message, type = 'info', targetRole = null, targetDept = null, targetUserId = null }) {
  await db.prepare(`INSERT INTO notifications (id,title,message,type,target_role,target_dept,target_user_id,read,created_at)
    VALUES (?,?,?,?,?,?,?,0,?)`).run(
    genId('notif'), title, message, type, targetRole, targetDept, targetUserId, today()
  );
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    department: u.department || undefined, program: u.program || undefined,
    batchYear: u.batch_year || undefined, profileImage: u.profile_image || undefined,
    assignedBatchYear: u.assigned_batch_year || undefined,
    assignedDepartment: u.assigned_department || undefined,
    assignedProgram: u.assigned_program || undefined,
    status: u.status, verified: !!u.verified,
    phone: u.phone || undefined, studentId: u.student_id || undefined,
    employmentStatus: u.employment_status || undefined,
    currentCompany: u.current_company || undefined, position: u.position || undefined,
    joinDate: u.created_at, lastLogin: u.last_login || 'Never',
  };
}

function donationOut(d) {
  return {
    id: d.id, alumniName: d.alumni_name, alumniEmail: d.alumni_email, department: d.department,
    campaign: d.campaign, amount: d.amount, type: d.type, description: d.description,
    proofUrl: d.proof_url, status: d.status, submittedAt: d.submitted_at,
    verifiedAt: d.verified_at || undefined, verifiedBy: d.verified_by || undefined,
    rejectionReason: d.rejection_reason || undefined,
  };
}

function campaignOut(c) {
  return { id: c.id, name: c.name, description: c.description, target: c.target, current: c.current, department: c.department, active: !!c.active, deadline: c.deadline || undefined };
}

function eventOut(e) {
  return {
    id: e.id, title: e.title, description: e.description, date: e.date, time: e.time,
    location: e.location, department: e.department, createdBy: e.created_by,
    registeredCount: e.registered_count, maxCapacity: e.max_capacity || undefined,
    status: e.status, imageUrl: e.image_url || undefined,
  };
}

function jobOut(j) {
  return {
    id: j.id, title: j.title, company: j.company, location: j.location, type: j.type,
    department: j.department, description: j.description, requirements: j.requirements,
    postedBy: j.posted_by, postedByRole: j.posted_by_role, postedAt: j.posted_at,
    active: !!j.active, suggestedBy: j.suggested_by || undefined, status: j.status,
  };
}

function announcementOut(a) {
  return { id: a.id, title: a.title, content: a.content, category: a.category, targetDept: a.target_dept, date: a.date, pinned: !!a.pinned, author: a.author };
}

function surveyOut(s) {
  return {
    id: s.id, title: s.title, description: s.description, targetDept: s.target_dept, targetYear: s.target_year,
    questions: JSON.parse(s.questions || '[]'), totalSent: s.total_sent, totalResponses: s.total_responses,
    status: s.status, createdDate: s.created_date,
  };
}

async function deptOut(d) {
  return { id: d.id, code: d.code, name: d.name, dean: d.dean, active: !!d.active, programs: JSON.parse(d.programs || '[]'),
    alumniCount: (await db.prepare("SELECT COUNT(*)::int c FROM users WHERE role='alumni' AND department = ?").get(d.code)).c };
}

function repOut(r) {
  return {
    id: r.id, name: r.name, email: r.email, batchYear: r.batch_year, department: r.department, program: r.program,
    assignedDate: r.assigned_date, verificationsCount: r.verifications_count, profileImage: r.profile_image, status: r.status,
  };
}

function pendingOut(p) {
  return {
    id: p.id, name: p.name, email: p.email, phone: p.phone, department: p.department, program: p.program,
    studentId: p.student_id, batchYear: p.batch_year, graduationDate: p.graduation_date,
    currentEmploymentStatus: p.current_employment_status, profileImage: p.profile_image,
    registeredDate: p.registered_date, status: p.status, isBatchVerified: !!p.is_batch_verified,
    batchVerifiedBy: p.batch_verified_by || undefined,
  };
}

function notifOut(n) {
  return { id: n.id, title: n.title, message: n.message, type: n.type, targetRole: n.target_role || undefined, targetDept: n.target_dept || undefined, read: !!n.read, createdAt: n.created_at };
}

function auditOut(a) {
  return { id: a.id, timestamp: a.timestamp, user: a.user_name, role: a.role, action: a.action, module: a.module, details: a.details, ipAddress: a.ip_address, severity: a.severity };
}

// ============================================================
// AUTH
// ============================================================

router.post('/api/auth/login', async (req, res) => {
  const { email, password } = await readBody(req);
  if (!email || !password) return sendJson(res, 400, { error: 'email and password are required' });
  const u = await db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (!u || !verifyPassword(password, u.password_hash, u.password_salt)) {
    return sendJson(res, 401, { error: 'Invalid email or password' });
  }
  if (u.status !== 'Active') return sendJson(res, 403, { error: `Account is ${u.status.toLowerCase()}.` });
  await db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), u.id);
  const token = signToken({ sub: u.id, role: u.role });
  await logAudit(u, 'Login', 'Auth', `${u.email} logged in`, req);
  sendJson(res, 200, { token, user: publicUser(u) });
});

router.post('/api/auth/register', async (req, res) => {
  const b = await readBody(req);
  const required = ['firstName', 'lastName', 'email', 'password', 'department', 'program', 'batchYear'];
  for (const f of required) if (!b[f]) return sendJson(res, 400, { error: `${f} is required` });
  const email = String(b.email).toLowerCase();
  const existsUser = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  const existsPending = await db.prepare('SELECT id FROM pending_registrations WHERE email = ?').get(email);
  if (existsUser || existsPending) return sendJson(res, 409, { error: 'Email already registered' });
  const { hash, salt } = hashPassword(b.password);
  const id = genId('preg');
  const name = `${b.firstName} ${b.lastName}`;
  await db.prepare(`INSERT INTO pending_registrations
    (id,name,email,password_hash,password_salt,phone,department,program,student_id,batch_year,graduation_date,current_employment_status,profile_image,registered_date,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'Pending')`).run(
    id, name, email, hash, salt, b.phone || null, b.department, b.program, b.studentId || null,
    Number(b.batchYear), b.graduationDate || null, b.currentEmploymentStatus || null,
    b.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`,
    today()
  );
  await notify({ title: 'New Alumni Registration', message: `${name} has registered and is pending approval.`, type: 'warning', targetRole: 'admin' });
  await logAudit(null, 'Register', 'Auth', `${email} submitted a registration request`, req);
  sendJson(res, 201, { message: 'Registration submitted. An administrator must approve your account before you can log in.' });
});

router.get('/api/auth/me', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  sendJson(res, 200, { user: publicUser(user) });
});

router.post('/api/auth/logout', async (req, res) => {
  // Stateless tokens: logout is a client-side no-op (discard the token).
  sendJson(res, 200, { message: 'Logged out' });
});

// ============================================================
// USERS (admin account management)
// ============================================================

router.get('/api/users', async (req, res, q) => {
  const user = await requireRole(req, res, 'admin');
  if (!user) return;
  let sql = 'SELECT * FROM users WHERE 1=1';
  const params = [];
  if (q.get('role')) { sql += ' AND role = ?'; params.push(q.get('role')); }
  if (q.get('department')) { sql += ' AND department = ?'; params.push(q.get('department')); }
  if (q.get('status')) { sql += ' AND status = ?'; params.push(q.get('status')); }
  sql += ' ORDER BY created_at DESC';
  const rows = await db.prepare(sql).all(...params);
  sendJson(res, 200, { users: rows.map(publicUser) });
});

router.post('/api/users', async (req, res) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const b = await readBody(req);
  if (!b.name || !b.email || !b.password || !b.role) return sendJson(res, 400, { error: 'name, email, password, role are required' });
  const email = String(b.email).toLowerCase();
  if (await db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return sendJson(res, 409, { error: 'Email already exists' });
  const { hash, salt } = hashPassword(b.password);
  const id = genId('usr');
  await db.prepare(`INSERT INTO users (id,name,email,password_hash,password_salt,role,department,program,batch_year,profile_image,status,verified)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,1)`).run(
    id, b.name, email, hash, salt, b.role, b.department || null, b.program || null, b.batchYear || null,
    b.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=1B3A6B&color=fff`,
    b.status || 'Active'
  );
  await logAudit(admin, 'Create User', 'User Management', `Created ${b.role} account for ${email}`, req);
  sendJson(res, 201, { user: publicUser(await db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
});

router.get('/api/users/:id', async (req, res, q, params) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'admin' && user.id !== params.id) return sendJson(res, 403, { error: 'Forbidden' });
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').get(params.id);
  if (!row) return sendJson(res, 404, { error: 'User not found' });
  sendJson(res, 200, { user: publicUser(row) });
});

router.put('/api/users/:id', async (req, res, q, params) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'admin' && user.id !== params.id) return sendJson(res, 403, { error: 'Forbidden' });
  const target = await db.prepare('SELECT * FROM users WHERE id = ?').get(params.id);
  if (!target) return sendJson(res, 404, { error: 'User not found' });
  const b = await readBody(req);
  const fields = {
    name: b.name, department: b.department, program: b.program, batch_year: b.batchYear,
    profile_image: b.profileImage, phone: b.phone, student_id: b.studentId,
    employment_status: b.employmentStatus, current_company: b.currentCompany, position: b.position,
    graduation_date: b.graduationDate,
  };
  // Only admins may change role/status
  if (user.role === 'admin') {
    if (b.role) fields.role = b.role;
    if (b.status) fields.status = b.status;
    if (b.verified !== undefined) fields.verified = b.verified ? 1 : 0;
  }
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return sendJson(res, 400, { error: 'No updatable fields provided' });
  const setSql = keys.map((k) => `${k} = ?`).join(', ');
  await db.prepare(`UPDATE users SET ${setSql} WHERE id = ?`).run(...keys.map((k) => fields[k]), params.id);
  await logAudit(user, 'Update User', 'User Management', `Updated user ${target.email}`, req);
  sendJson(res, 200, { user: publicUser(await db.prepare('SELECT * FROM users WHERE id = ?').get(params.id)) });
});

router.delete('/api/users/:id', async (req, res, q, params) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const target = await db.prepare('SELECT * FROM users WHERE id = ?').get(params.id);
  if (!target) return sendJson(res, 404, { error: 'User not found' });
  await db.prepare("UPDATE users SET status = 'Deactivated' WHERE id = ?").run(params.id);
  await logAudit(admin, 'Deactivate User', 'User Management', `Deactivated ${target.email}`, req);
  sendJson(res, 200, { message: 'User deactivated' });
});

// ============================================================
// PENDING REGISTRATIONS
// ============================================================

router.get('/api/pending-registrations', async (req, res) => {
  const user = await requireRole(req, res, 'admin', 'representative');
  if (!user) return;
  let rows = await db.prepare("SELECT * FROM pending_registrations ORDER BY registered_date DESC").all();
  if (user.role === 'representative') {
    rows = rows.filter((p) => p.department === user.assigned_department && p.batch_year === user.assigned_batch_year);
  }
  sendJson(res, 200, { registrations: rows.map(pendingOut) });
});

router.post('/api/pending-registrations/:id/batch-verify', async (req, res, q, params) => {
  const rep = await requireRole(req, res, 'representative', 'admin');
  if (!rep) return;
  const p = await db.prepare('SELECT * FROM pending_registrations WHERE id = ?').get(params.id);
  if (!p) return sendJson(res, 404, { error: 'Registration not found' });
  await db.prepare('UPDATE pending_registrations SET is_batch_verified = 1, batch_verified_by = ? WHERE id = ?').run(rep.name, params.id);
  if (rep.role === 'representative') {
    await db.prepare('UPDATE representatives SET verifications_count = verifications_count + 1 WHERE user_id = ?').run(rep.id);
  }
  await logAudit(rep, 'Batch Verify', 'Registrations', `Verified batch membership for ${p.email}`, req);
  sendJson(res, 200, { registration: pendingOut(await db.prepare('SELECT * FROM pending_registrations WHERE id = ?').get(params.id)) });
});

router.post('/api/pending-registrations/:id/approve', async (req, res, q, params) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const p = await db.prepare('SELECT * FROM pending_registrations WHERE id = ?').get(params.id);
  if (!p) return sendJson(res, 404, { error: 'Registration not found' });
  if (p.status !== 'Pending') return sendJson(res, 400, { error: `Already ${p.status}` });
  const id = genId('usr');
  await db.prepare(`INSERT INTO users
    (id,name,email,password_hash,password_salt,role,department,program,batch_year,phone,student_id,graduation_date,employment_status,profile_image,status,verified)
    VALUES (?,?,?,?,?,'alumni',?,?,?,?,?,?,?,?,'Active',1)`).run(
    id, p.name, p.email, p.password_hash, p.password_salt, p.department, p.program, p.batch_year,
    p.phone, p.student_id, p.graduation_date, p.current_employment_status, p.profile_image
  );
  await db.prepare("UPDATE pending_registrations SET status = 'Approved' WHERE id = ?").run(params.id);
  await notify({ title: 'Registration Approved', message: 'Your alumni account has been approved. You can now log in.', type: 'success', targetUserId: id });
  await logAudit(admin, 'Approve Registration', 'Registrations', `Approved ${p.email}`, req);
  sendJson(res, 200, { message: 'Approved', userId: id });
});

router.post('/api/pending-registrations/:id/reject', async (req, res, q, params) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const b = await readBody(req);
  const p = await db.prepare('SELECT * FROM pending_registrations WHERE id = ?').get(params.id);
  if (!p) return sendJson(res, 404, { error: 'Registration not found' });
  await db.prepare("UPDATE pending_registrations SET status = 'Rejected' WHERE id = ?").run(params.id);
  await logAudit(admin, 'Reject Registration', 'Registrations', `Rejected ${p.email}: ${b.reason || 'no reason given'}`, req);
  sendJson(res, 200, { message: 'Rejected' });
});

// ============================================================
// ALUMNI DIRECTORY / PROFILE
// ============================================================

router.get('/api/alumni', async (req, res, q) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  let sql = "SELECT * FROM users WHERE role = 'alumni'";
  const params = [];
  if (q.get('department')) { sql += ' AND department = ?'; params.push(q.get('department')); }
  if (q.get('program')) { sql += ' AND program = ?'; params.push(q.get('program')); }
  if (q.get('batchYear')) { sql += ' AND batch_year = ?'; params.push(Number(q.get('batchYear'))); }
  if (q.get('employmentStatus')) { sql += ' AND employment_status = ?'; params.push(q.get('employmentStatus')); }
  let rows = await db.prepare(sql).all(...params);
  if (user.role === 'representative') {
    rows = rows.filter((r) => r.department === user.assigned_department && r.batch_year === user.assigned_batch_year);
  }
  sendJson(res, 200, {
    alumni: rows.map((r) => ({
      id: r.id, name: r.name, email: r.email, department: r.department, program: r.program,
      batchYear: r.batch_year, employmentStatus: r.employment_status || 'Unemployed',
      currentCompany: r.current_company || undefined, position: r.position || undefined, verified: !!r.verified,
    })),
  });
});

router.get('/api/alumni/me', async (req, res) => {
  const user = await requireRole(req, res, 'alumni');
  if (!user) return;
  sendJson(res, 200, { user: publicUser(user) });
});

router.put('/api/alumni/me', async (req, res) => {
  const user = await requireRole(req, res, 'alumni');
  if (!user) return;
  const b = await readBody(req);
  const fields = {
    name: b.name, phone: b.phone, profile_image: b.profileImage,
    employment_status: b.employmentStatus, current_company: b.currentCompany, position: b.position,
  };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return sendJson(res, 400, { error: 'No updatable fields provided' });
  await db.prepare(`UPDATE users SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), user.id);
  sendJson(res, 200, { user: publicUser(await db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
});

router.put('/api/alumni/:id', async (req, res, q, params) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const target = await db.prepare("SELECT * FROM users WHERE id = ? AND role = 'alumni'").get(params.id);
  if (!target) return sendJson(res, 404, { error: 'Alumni not found' });
  const b = await readBody(req);
  const fields = {
    department: b.department, program: b.program, batch_year: b.batchYear,
    employment_status: b.employmentStatus, current_company: b.currentCompany, position: b.position,
    verified: b.verified !== undefined ? (b.verified ? 1 : 0) : undefined,
  };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return sendJson(res, 400, { error: 'No updatable fields provided' });
  await db.prepare(`UPDATE users SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), params.id);
  await logAudit(admin, 'Update Alumni Record', 'Alumni Database', `Updated ${target.email}`, req);
  sendJson(res, 200, { user: publicUser(await db.prepare('SELECT * FROM users WHERE id = ?').get(params.id)) });
});

// ============================================================
// DEPARTMENTS
// ============================================================

router.get('/api/departments', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM departments ORDER BY code').all();
  sendJson(res, 200, { departments: await Promise.all(rows.map(deptOut)) });
});

router.post('/api/departments', async (req, res) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const b = await readBody(req);
  if (!b.code || !b.name) return sendJson(res, 400, { error: 'code and name are required' });
  const id = genId('dept');
  await db.prepare('INSERT INTO departments (id,code,name,dean,active,programs) VALUES (?,?,?,?,1,?)')
    .run(id, b.code, b.name, b.dean || '', JSON.stringify(b.programs || []));
  await logAudit(admin, 'Create Department', 'Department Management', `Created ${b.code}`, req);
  sendJson(res, 201, { department: await deptOut(await db.prepare('SELECT * FROM departments WHERE id = ?').get(id)) });
});

router.put('/api/departments/:id', async (req, res, q, params) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const d = await db.prepare('SELECT * FROM departments WHERE id = ?').get(params.id);
  if (!d) return sendJson(res, 404, { error: 'Department not found' });
  const b = await readBody(req);
  const fields = { name: b.name, dean: b.dean, active: b.active !== undefined ? (b.active ? 1 : 0) : undefined, programs: b.programs ? JSON.stringify(b.programs) : undefined };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length) await db.prepare(`UPDATE departments SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), params.id);
  await logAudit(admin, 'Update Department', 'Department Management', `Updated ${d.code}`, req);
  sendJson(res, 200, { department: await deptOut(await db.prepare('SELECT * FROM departments WHERE id = ?').get(params.id)) });
});

router.delete('/api/departments/:id', async (req, res, q, params) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const d = await db.prepare('SELECT * FROM departments WHERE id = ?').get(params.id);
  if (!d) return sendJson(res, 404, { error: 'Department not found' });
  await db.prepare('DELETE FROM departments WHERE id = ?').run(params.id);
  await logAudit(admin, 'Delete Department', 'Department Management', `Deleted ${d.code}`, req);
  sendJson(res, 200, { message: 'Deleted' });
});

// ============================================================
// BATCH REPRESENTATIVES
// ============================================================

router.get('/api/representatives', async (req, res) => {
  const user = await requireRole(req, res, 'admin');
  if (!user) return;
  const rows = await db.prepare('SELECT * FROM representatives ORDER BY assigned_date DESC').all();
  sendJson(res, 200, { representatives: rows.map(repOut) });
});

router.post('/api/representatives', async (req, res) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const b = await readBody(req);
  if (!b.userId) return sendJson(res, 400, { error: 'userId is required (must be an existing alumni user)' });
  const u = await db.prepare('SELECT * FROM users WHERE id = ?').get(b.userId);
  if (!u) return sendJson(res, 404, { error: 'User not found' });
  const id = genId('rep');
  await db.prepare(`INSERT INTO representatives (id,user_id,name,email,batch_year,department,program,verifications_count,profile_image,status)
    VALUES (?,?,?,?,?,?,?,0,?,'Active')`).run(
    id, u.id, u.name, u.email, b.batchYear || u.batch_year, b.department || u.department, b.program || u.program, u.profile_image
  );
  await db.prepare(`UPDATE users SET role = 'representative', assigned_batch_year = ?, assigned_department = ?, assigned_program = ? WHERE id = ?`)
    .run(b.batchYear || u.batch_year, b.department || u.department, b.program || u.program, u.id);
  await logAudit(admin, 'Assign Representative', 'Batch Representatives', `Assigned ${u.email}`, req);
  sendJson(res, 201, { representative: repOut(await db.prepare('SELECT * FROM representatives WHERE id = ?').get(id)) });
});

router.put('/api/representatives/:id', async (req, res, q, params) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const r = await db.prepare('SELECT * FROM representatives WHERE id = ?').get(params.id);
  if (!r) return sendJson(res, 404, { error: 'Representative not found' });
  const b = await readBody(req);
  const fields = { status: b.status };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length) await db.prepare(`UPDATE representatives SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), params.id);
  sendJson(res, 200, { representative: repOut(await db.prepare('SELECT * FROM representatives WHERE id = ?').get(params.id)) });
});

router.delete('/api/representatives/:id', async (req, res, q, params) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const r = await db.prepare('SELECT * FROM representatives WHERE id = ?').get(params.id);
  if (!r) return sendJson(res, 404, { error: 'Representative not found' });
  await db.prepare('DELETE FROM representatives WHERE id = ?').run(params.id);
  if (r.user_id) await db.prepare("UPDATE users SET role = 'alumni' WHERE id = ?").run(r.user_id);
  await logAudit(admin, 'Remove Representative', 'Batch Representatives', `Removed ${r.email}`, req);
  sendJson(res, 200, { message: 'Removed' });
});

// ============================================================
// CAMPAIGNS
// ============================================================

router.get('/api/campaigns', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM campaigns ORDER BY rowid DESC').all();
  sendJson(res, 200, { campaigns: rows.map(campaignOut) });
});

router.post('/api/campaigns', async (req, res) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const b = await readBody(req);
  if (!b.name || !b.target) return sendJson(res, 400, { error: 'name and target are required' });
  const id = genId('camp');
  await db.prepare('INSERT INTO campaigns (id,name,description,target,current,department,active,deadline) VALUES (?,?,?,?,0,?,1,?)')
    .run(id, b.name, b.description || '', b.target, b.department || 'All', b.deadline || null);
  await logAudit(admin, 'Create Campaign', 'Donation Management', `Created campaign ${b.name}`, req);
  sendJson(res, 201, { campaign: campaignOut(await db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id)) });
});

router.put('/api/campaigns/:id', async (req, res, q, params) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const c = await db.prepare('SELECT * FROM campaigns WHERE id = ?').get(params.id);
  if (!c) return sendJson(res, 404, { error: 'Campaign not found' });
  const b = await readBody(req);
  const fields = { name: b.name, description: b.description, target: b.target, department: b.department, active: b.active !== undefined ? (b.active ? 1 : 0) : undefined, deadline: b.deadline };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length) await db.prepare(`UPDATE campaigns SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), params.id);
  sendJson(res, 200, { campaign: campaignOut(await db.prepare('SELECT * FROM campaigns WHERE id = ?').get(params.id)) });
});

// ============================================================
// DONATIONS
// ============================================================

router.get('/api/donations', async (req, res, q) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  let sql = 'SELECT * FROM donations WHERE 1=1';
  const params = [];
  if (q.get('status')) { sql += ' AND status = ?'; params.push(q.get('status')); }
  if (q.get('campaign')) { sql += ' AND campaign = ?'; params.push(q.get('campaign')); }
  if (user.role === 'alumni') { sql += ' AND alumni_email = ?'; params.push(user.email); }
  else if (q.get('department')) { sql += ' AND department = ?'; params.push(q.get('department')); }
  sql += ' ORDER BY submitted_at DESC';
  let rows = await db.prepare(sql).all(...params);
  if (user.role === 'representative') rows = rows.filter((d) => d.department === user.assigned_department);
  sendJson(res, 200, { donations: rows.map(donationOut) });
});

router.post('/api/donations', async (req, res) => {
  const user = await requireRole(req, res, 'alumni');
  if (!user) return;
  const b = await readBody(req);
  if (!b.campaign || !b.type) return sendJson(res, 400, { error: 'campaign and type are required' });
  if (b.type === 'Cash' && !(b.amount > 0)) return sendJson(res, 400, { error: 'amount must be greater than 0 for Cash donations' });
  const campaign = await db.prepare('SELECT * FROM campaigns WHERE name = ?').get(b.campaign);
  if (!campaign) return sendJson(res, 404, { error: 'Campaign not found' });
  const id = genId('don');
  await db.prepare(`INSERT INTO donations (id,alumni_id,alumni_name,alumni_email,department,campaign,amount,type,description,proof_url,status,submitted_at)
    VALUES (?,?,?,?,?,?,?,?,?,?, 'Pending', ?)`).run(
    id, user.id, user.name, user.email, user.department, b.campaign, b.amount || 0, b.type,
    b.description || '', b.proofUrl || null, new Date().toISOString()
  );
  await notify({ title: 'Donation Submitted', message: `A new donation from ${user.name} is pending verification.`, type: 'info', targetRole: 'admin' });
  await logAudit(user, 'Submit Donation', 'Donations', `Submitted donation to ${b.campaign}`, req);
  sendJson(res, 201, { donation: donationOut(await db.prepare('SELECT * FROM donations WHERE id = ?').get(id)) });
});

router.put('/api/donations/:id/verify', async (req, res, q, params) => {
  const user = await requireRole(req, res, 'admin', 'representative');
  if (!user) return;
  const d = await db.prepare('SELECT * FROM donations WHERE id = ?').get(params.id);
  if (!d) return sendJson(res, 404, { error: 'Donation not found' });
  if (d.status !== 'Pending') return sendJson(res, 400, { error: `Donation already ${d.status}` });
  await db.prepare("UPDATE donations SET status = 'Verified', verified_at = ?, verified_by = ? WHERE id = ?")
    .run(new Date().toISOString(), user.name, params.id);
  if (d.amount > 0) await db.prepare('UPDATE campaigns SET current = current + ? WHERE name = ?').run(d.amount, d.campaign);
  if (d.alumni_id) await notify({ title: 'Donation Verified', message: `Your donation to ${d.campaign} has been verified.`, type: 'success', targetUserId: d.alumni_id });
  await logAudit(user, 'Verify Donation', 'Donation Management', `Verified donation ${d.id} from ${d.alumni_email}`, req);
  sendJson(res, 200, { donation: donationOut(await db.prepare('SELECT * FROM donations WHERE id = ?').get(params.id)) });
});

router.put('/api/donations/:id/reject', async (req, res, q, params) => {
  const user = await requireRole(req, res, 'admin', 'representative');
  if (!user) return;
  const b = await readBody(req);
  const d = await db.prepare('SELECT * FROM donations WHERE id = ?').get(params.id);
  if (!d) return sendJson(res, 404, { error: 'Donation not found' });
  if (d.status !== 'Pending') return sendJson(res, 400, { error: `Donation already ${d.status}` });
  await db.prepare("UPDATE donations SET status = 'Rejected', rejection_reason = ?, verified_by = ?, verified_at = ? WHERE id = ?")
    .run(b.reason || 'No reason provided', user.name, new Date().toISOString(), params.id);
  if (d.alumni_id) await notify({ title: 'Donation Rejected', message: `Your donation to ${d.campaign} was rejected: ${b.reason || 'no reason given'}`, type: 'error', targetUserId: d.alumni_id });
  await logAudit(user, 'Reject Donation', 'Donation Management', `Rejected donation ${d.id}: ${b.reason || ''}`, req);
  sendJson(res, 200, { donation: donationOut(await db.prepare('SELECT * FROM donations WHERE id = ?').get(params.id)) });
});

// ============================================================
// EVENTS
// ============================================================

router.get('/api/events', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM events ORDER BY date DESC').all();
  const user = await getAuthUser(req); // optional — public endpoint, but personalize if logged in
  const myRegs = user
    ? new Set((await db.prepare('SELECT event_id FROM event_registrations WHERE user_id = ?').all(user.id)).map((r) => r.event_id))
    : new Set();
  sendJson(res, 200, { events: rows.map((r) => ({ ...eventOut(r), registeredByMe: myRegs.has(r.id) })) });
});

router.post('/api/events', async (req, res) => {
  const user = await requireRole(req, res, 'admin', 'faculty');
  if (!user) return;
  const b = await readBody(req);
  if (!b.title || !b.date) return sendJson(res, 400, { error: 'title and date are required' });
  const id = genId('evt');
  await db.prepare(`INSERT INTO events (id,title,description,date,time,location,department,created_by,registered_count,max_capacity,status,image_url)
    VALUES (?,?,?,?,?,?,?,?,0,?,'Upcoming',?)`).run(
    id, b.title, b.description || '', b.date, b.time || '', b.location || '', b.department || 'All',
    user.name, b.maxCapacity || null, b.imageUrl || null
  );
  await notify({ title: 'New Event Published', message: `${b.title} has been scheduled for ${b.date}.`, type: 'info', targetDept: b.department !== 'All' ? b.department : null });
  await logAudit(user, 'Create Event', 'Event Management', `Created event ${b.title}`, req);
  sendJson(res, 201, { event: eventOut(await db.prepare('SELECT * FROM events WHERE id = ?').get(id)) });
});

router.put('/api/events/:id', async (req, res, q, params) => {
  const user = await requireRole(req, res, 'admin', 'faculty');
  if (!user) return;
  const e = await db.prepare('SELECT * FROM events WHERE id = ?').get(params.id);
  if (!e) return sendJson(res, 404, { error: 'Event not found' });
  const b = await readBody(req);
  const fields = { title: b.title, description: b.description, date: b.date, time: b.time, location: b.location, department: b.department, max_capacity: b.maxCapacity, status: b.status, image_url: b.imageUrl };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length) await db.prepare(`UPDATE events SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), params.id);
  await logAudit(user, 'Update Event', 'Event Management', `Updated event ${e.title}`, req);
  sendJson(res, 200, { event: eventOut(await db.prepare('SELECT * FROM events WHERE id = ?').get(params.id)) });
});

router.delete('/api/events/:id', async (req, res, q, params) => {
  const user = await requireRole(req, res, 'admin', 'faculty');
  if (!user) return;
  const e = await db.prepare('SELECT * FROM events WHERE id = ?').get(params.id);
  if (!e) return sendJson(res, 404, { error: 'Event not found' });
  await db.prepare('DELETE FROM events WHERE id = ?').run(params.id);
  await logAudit(user, 'Delete Event', 'Event Management', `Deleted event ${e.title}`, req);
  sendJson(res, 200, { message: 'Deleted' });
});

router.post('/api/events/:id/register', async (req, res, q, params) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  const e = await db.prepare('SELECT * FROM events WHERE id = ?').get(params.id);
  if (!e) return sendJson(res, 404, { error: 'Event not found' });
  if (e.max_capacity && e.registered_count >= e.max_capacity) return sendJson(res, 400, { error: 'Event is at full capacity' });
  const already = await db.prepare('SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ?').get(params.id, user.id);
  if (already) return sendJson(res, 409, { error: 'Already registered' });
  await db.prepare('INSERT INTO event_registrations (id,event_id,user_id) VALUES (?,?,?)').run(genId('reg'), params.id, user.id);
  await db.prepare('UPDATE events SET registered_count = registered_count + 1 WHERE id = ?').run(params.id);
  sendJson(res, 201, { message: 'Registered', event: eventOut(await db.prepare('SELECT * FROM events WHERE id = ?').get(params.id)) });
});

// ============================================================
// ANNOUNCEMENTS
// ============================================================

router.get('/api/announcements', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM announcements ORDER BY pinned DESC, date DESC').all();
  sendJson(res, 200, { announcements: rows.map(announcementOut) });
});

router.post('/api/announcements', async (req, res) => {
  const user = await requireRole(req, res, 'admin');
  if (!user) return;
  const b = await readBody(req);
  if (!b.title || !b.content) return sendJson(res, 400, { error: 'title and content are required' });
  const id = genId('ann');
  await db.prepare('INSERT INTO announcements (id,title,content,category,target_dept,date,pinned,author) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, b.title, b.content, b.category || 'General', b.targetDept || 'All', today(), b.pinned ? 1 : 0, user.name);
  await logAudit(user, 'Post Announcement', 'Announcements', `Posted "${b.title}"`, req);
  sendJson(res, 201, { announcement: announcementOut(await db.prepare('SELECT * FROM announcements WHERE id = ?').get(id)) });
});

router.put('/api/announcements/:id', async (req, res, q, params) => {
  const user = await requireRole(req, res, 'admin');
  if (!user) return;
  const a = await db.prepare('SELECT * FROM announcements WHERE id = ?').get(params.id);
  if (!a) return sendJson(res, 404, { error: 'Announcement not found' });
  const b = await readBody(req);
  const fields = { title: b.title, content: b.content, category: b.category, target_dept: b.targetDept, pinned: b.pinned !== undefined ? (b.pinned ? 1 : 0) : undefined };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length) await db.prepare(`UPDATE announcements SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), params.id);
  sendJson(res, 200, { announcement: announcementOut(await db.prepare('SELECT * FROM announcements WHERE id = ?').get(params.id)) });
});

router.delete('/api/announcements/:id', async (req, res, q, params) => {
  const user = await requireRole(req, res, 'admin');
  if (!user) return;
  await db.prepare('DELETE FROM announcements WHERE id = ?').run(params.id);
  await logAudit(user, 'Delete Announcement', 'Announcements', `Deleted announcement ${params.id}`, req);
  sendJson(res, 200, { message: 'Deleted' });
});

// ============================================================
// JOB BOARD
// ============================================================

router.get('/api/jobs', async (req, res, q) => {
  let sql = 'SELECT * FROM jobs WHERE 1=1';
  const params = [];
  if (q.get('status')) { sql += ' AND status = ?'; params.push(q.get('status')); }
  if (q.get('department')) { sql += ' AND department = ?'; params.push(q.get('department')); }
  sql += ' ORDER BY posted_at DESC';
  const rows = await db.prepare(sql).all(...params);
  sendJson(res, 200, { jobs: rows.map(jobOut) });
});

router.post('/api/jobs', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  const b = await readBody(req);
  if (!b.title || !b.company) return sendJson(res, 400, { error: 'title and company are required' });
  const id = genId('job');
  const isStaff = user.role === 'admin' || user.role === 'faculty';
  await db.prepare(`INSERT INTO jobs (id,title,company,location,type,department,description,requirements,posted_by,posted_by_role,posted_at,active,suggested_by,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, b.title, b.company, b.location || '', b.type || 'Full-time', b.department || 'All',
    b.description || '', b.requirements || '', user.name, user.role, new Date().toISOString(),
    isStaff ? 1 : 0, isStaff ? null : user.name, isStaff ? 'Active' : 'Pending'
  );
  if (!isStaff) await notify({ title: 'Job Posting Suggested', message: `${user.name} suggested a job posting: ${b.title}`, type: 'info', targetRole: 'admin' });
  await logAudit(user, 'Post Job', 'Job Board', `Posted "${b.title}" at ${b.company}`, req);
  sendJson(res, 201, { job: jobOut(await db.prepare('SELECT * FROM jobs WHERE id = ?').get(id)) });
});

router.put('/api/jobs/:id', async (req, res, q, params) => {
  const user = await requireRole(req, res, 'admin', 'faculty');
  if (!user) return;
  const j = await db.prepare('SELECT * FROM jobs WHERE id = ?').get(params.id);
  if (!j) return sendJson(res, 404, { error: 'Job not found' });
  const b = await readBody(req);
  const fields = { title: b.title, company: b.company, location: b.location, type: b.type, department: b.department, description: b.description, requirements: b.requirements };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length) await db.prepare(`UPDATE jobs SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), params.id);
  sendJson(res, 200, { job: jobOut(await db.prepare('SELECT * FROM jobs WHERE id = ?').get(params.id)) });
});

router.post('/api/jobs/:id/approve', async (req, res, q, params) => {
  const user = await requireRole(req, res, 'admin', 'faculty');
  if (!user) return;
  await db.prepare("UPDATE jobs SET active = 1, status = 'Active' WHERE id = ?").run(params.id);
  await logAudit(user, 'Approve Job', 'Job Board', `Approved job ${params.id}`, req);
  sendJson(res, 200, { job: jobOut(await db.prepare('SELECT * FROM jobs WHERE id = ?').get(params.id)) });
});

router.post('/api/jobs/:id/close', async (req, res, q, params) => {
  const user = await requireRole(req, res, 'admin', 'faculty');
  if (!user) return;
  await db.prepare("UPDATE jobs SET active = 0, status = 'Closed' WHERE id = ?").run(params.id);
  await logAudit(user, 'Close Job', 'Job Board', `Closed job ${params.id}`, req);
  sendJson(res, 200, { job: jobOut(await db.prepare('SELECT * FROM jobs WHERE id = ?').get(params.id)) });
});

// ============================================================
// TRACER SURVEYS
// ============================================================

router.get('/api/surveys', async (req, res, q) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  let sql = 'SELECT * FROM surveys WHERE 1=1';
  const params = [];
  if (user.role === 'alumni') { sql += " AND status = 'Active'"; }
  if (q.get('status')) { sql += ' AND status = ?'; params.push(q.get('status')); }
  sql += ' ORDER BY created_date DESC';
  const rows = await db.prepare(sql).all(...params);
  sendJson(res, 200, { surveys: rows.map(surveyOut) });
});

router.post('/api/surveys', async (req, res) => {
  const user = await requireRole(req, res, 'admin', 'faculty');
  if (!user) return;
  const b = await readBody(req);
  if (!b.title) return sendJson(res, 400, { error: 'title is required' });
  const id = genId('srv');
  await db.prepare(`INSERT INTO surveys (id,title,description,target_dept,target_year,questions,total_sent,total_responses,status,created_date)
    VALUES (?,?,?,?,?,?,?,0,?,?)`).run(
    id, b.title, b.description || '', b.targetDept || 'All', b.targetYear || 'All',
    JSON.stringify(b.questions || []), b.totalSent || 0, b.status || 'Draft', today()
  );
  await logAudit(user, 'Create Survey', 'Tracer Surveys', `Created survey "${b.title}"`, req);
  sendJson(res, 201, { survey: surveyOut(await db.prepare('SELECT * FROM surveys WHERE id = ?').get(id)) });
});

router.put('/api/surveys/:id', async (req, res, q, params) => {
  const user = await requireRole(req, res, 'admin', 'faculty');
  if (!user) return;
  const s = await db.prepare('SELECT * FROM surveys WHERE id = ?').get(params.id);
  if (!s) return sendJson(res, 404, { error: 'Survey not found' });
  const b = await readBody(req);
  const fields = {
    title: b.title, description: b.description, target_dept: b.targetDept, target_year: b.targetYear,
    questions: b.questions ? JSON.stringify(b.questions) : undefined, status: b.status, total_sent: b.totalSent,
  };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length) await db.prepare(`UPDATE surveys SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), params.id);
  if (b.status === 'Active' && s.status !== 'Active') {
    await notify({ title: 'New Tracer Survey', message: `"${s.title}" is now open. Please complete it when you can.`, type: 'info', targetRole: 'alumni' });
  }
  await logAudit(user, 'Update Survey', 'Tracer Surveys', `Updated survey ${s.title}`, req);
  sendJson(res, 200, { survey: surveyOut(await db.prepare('SELECT * FROM surveys WHERE id = ?').get(params.id)) });
});

router.get('/api/surveys/:id/responses', async (req, res, q, params) => {
  const user = await requireRole(req, res, 'admin', 'faculty');
  if (!user) return;
  const rows = await db.prepare('SELECT * FROM survey_responses WHERE survey_id = ? ORDER BY submitted_at DESC').all(params.id);
  sendJson(res, 200, {
    responses: rows.map((r) => ({
      id: r.id, surveyId: r.survey_id, alumniId: r.alumni_id, employmentStatus: r.employment_status,
      currentCompany: r.current_company, position: r.position, answers: JSON.parse(r.answers || '{}'), submittedAt: r.submitted_at,
    })),
  });
});

router.post('/api/surveys/:id/responses', async (req, res, q, params) => {
  const user = await requireRole(req, res, 'alumni');
  if (!user) return;
  const s = await db.prepare('SELECT * FROM surveys WHERE id = ?').get(params.id);
  if (!s) return sendJson(res, 404, { error: 'Survey not found' });
  if (s.status !== 'Active') return sendJson(res, 400, { error: 'This survey is not currently accepting responses' });
  const already = await db.prepare('SELECT id FROM survey_responses WHERE survey_id = ? AND alumni_id = ?').get(params.id, user.id);
  if (already) return sendJson(res, 409, { error: 'You have already submitted a response to this survey' });
  const b = await readBody(req);
  const id = genId('resp');
  await db.prepare(`INSERT INTO survey_responses (id,survey_id,alumni_id,employment_status,current_company,position,answers,submitted_at)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    id, params.id, user.id, b.employmentStatus || null, b.currentCompany || null, b.position || null,
    JSON.stringify(b.answers || {}), new Date().toISOString()
  );
  await db.prepare('UPDATE surveys SET total_responses = total_responses + 1 WHERE id = ?').run(params.id);
  if (b.employmentStatus) await db.prepare('UPDATE users SET employment_status = ?, current_company = ?, position = ? WHERE id = ?')
    .run(b.employmentStatus, b.currentCompany || null, b.position || null, user.id);
  sendJson(res, 201, { message: 'Response submitted' });
});

// ============================================================
// NOTIFICATIONS
// ============================================================

router.get('/api/notifications', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  const rows = await db.prepare(`SELECT * FROM notifications
    WHERE (target_user_id IS NULL OR target_user_id = ?)
      AND (target_role IS NULL OR target_role = ?)
      AND (target_dept IS NULL OR target_dept = ?)
    ORDER BY created_at DESC`).all(user.id, user.role, user.department || '');
  sendJson(res, 200, { notifications: rows.map(notifOut), unreadCount: rows.filter((n) => !n.read).length });
});

router.post('/api/notifications', async (req, res) => {
  const user = await requireRole(req, res, 'admin');
  if (!user) return;
  const b = await readBody(req);
  if (!b.title || !b.message) return sendJson(res, 400, { error: 'title and message are required' });
  await notify({ title: b.title, message: b.message, type: b.type || 'info', targetRole: b.targetRole || null, targetDept: b.targetDept || null });
  sendJson(res, 201, { message: 'Notification sent' });
});

router.put('/api/notifications/:id/read', async (req, res, q, params) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  await db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(params.id);
  sendJson(res, 200, { message: 'Marked as read' });
});

router.put('/api/notifications/read-all', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  await db.prepare(`UPDATE notifications SET read = 1
    WHERE (target_user_id IS NULL OR target_user_id = ?)
      AND (target_role IS NULL OR target_role = ?)
      AND (target_dept IS NULL OR target_dept = ?)`).run(user.id, user.role, user.department || '');
  sendJson(res, 200, { message: 'All marked as read' });
});

// ============================================================
// AUDIT LOGS
// ============================================================

router.get('/api/audit-logs', async (req, res, q) => {
  const user = await requireRole(req, res, 'admin', 'representative');
  if (!user) return;
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];
  if (user.role === 'representative') { sql += ' AND user_name = ?'; params.push(user.name); }
  if (q.get('severity')) { sql += ' AND severity = ?'; params.push(q.get('severity')); }
  if (q.get('module')) { sql += ' AND module = ?'; params.push(q.get('module')); }
  sql += ' ORDER BY timestamp DESC LIMIT 500';
  const rows = await db.prepare(sql).all(...params);
  sendJson(res, 200, { logs: rows.map(auditOut) });
});

// ============================================================
// REPORTS / ANALYTICS
// ============================================================

router.get('/api/reports/overview', async (req, res) => {
  const user = await requireRole(req, res, 'admin', 'faculty');
  if (!user) return;
  const totalAlumni = (await db.prepare("SELECT COUNT(*)::int c FROM users WHERE role='alumni'").get()).c;
  const pendingRegs = (await db.prepare("SELECT COUNT(*)::int c FROM pending_registrations WHERE status='Pending'").get()).c;
  const totalDonations = (await db.prepare("SELECT COALESCE(SUM(amount),0) s FROM donations WHERE status='Verified'").get()).s;
  const pendingDonations = (await db.prepare("SELECT COUNT(*)::int c FROM donations WHERE status='Pending'").get()).c;
  const activeEvents = (await db.prepare("SELECT COUNT(*)::int c FROM events WHERE status IN ('Upcoming','Ongoing')").get()).c;
  const activeJobs = (await db.prepare("SELECT COUNT(*)::int c FROM jobs WHERE status='Active'").get()).c;
  const employed = (await db.prepare("SELECT COUNT(*)::int c FROM users WHERE role='alumni' AND employment_status='Employed'").get()).c;
  sendJson(res, 200, { totalAlumni, pendingRegistrations: pendingRegs, totalDonationsVerified: totalDonations, pendingDonations, activeEvents, activeJobs, employedAlumni: employed });
});

router.get('/api/reports/population', async (req, res) => {
  const user = await requireRole(req, res, 'admin', 'faculty');
  if (!user) return;
  const byDept = await db.prepare("SELECT department, COUNT(*)::int count FROM users WHERE role='alumni' GROUP BY department").all();
  const byBatch = await db.prepare("SELECT batch_year AS batchYear, COUNT(*)::int count FROM users WHERE role='alumni' GROUP BY batch_year ORDER BY batch_year").all();
  const byEmployment = await db.prepare("SELECT COALESCE(employment_status,'Unreported') AS status, COUNT(*)::int count FROM users WHERE role='alumni' GROUP BY employment_status").all();
  sendJson(res, 200, { byDepartment: byDept, byBatchYear: byBatch, byEmploymentStatus: byEmployment });
});

router.get('/api/reports/donations', async (req, res) => {
  const user = await requireRole(req, res, 'admin', 'faculty');
  if (!user) return;
  const byCampaign = await db.prepare("SELECT campaign, COUNT(*)::int count, COALESCE(SUM(amount),0) total FROM donations WHERE status='Verified' GROUP BY campaign").all();
  const byDepartment = await db.prepare("SELECT department, COUNT(*)::int count, COALESCE(SUM(amount),0) total FROM donations WHERE status='Verified' GROUP BY department").all();
  const byStatus = await db.prepare("SELECT status, COUNT(*)::int count FROM donations GROUP BY status").all();
  sendJson(res, 200, { byCampaign, byDepartment, byStatus });
});

// ============================================================
// SYSTEM SETTINGS
// ============================================================

router.get('/api/settings', async (req, res) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const rows = await db.prepare('SELECT * FROM settings').all();
  const out = {};
  for (const r of rows) out[r.key] = JSON.parse(r.value);
  sendJson(res, 200, { settings: out });
});

// Public — any logged-in person needs to see how to actually pay a donation.
// Only exposes the donation payment block, never the full settings object.
router.get('/api/donation-info', async (req, res) => {
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'donation'").get();
  const DEFAULT_DONATION = {
    gcashNumber: '09XX XXX XXXX', gcashName: 'Asian College Alumni',
    bankName: 'BDO Unibank', accountName: 'Asian College Foundation Inc.',
    accountNumber: '1234-5678-90',
    instructions: 'After transferring, upload your receipt/screenshot in the Donation Center. Your donation will be verified within 1\u20133 business days.',
  };
  const donation = row ? { ...DEFAULT_DONATION, ...JSON.parse(row.value) } : DEFAULT_DONATION;
  sendJson(res, 200, { donation });
});

router.put('/api/settings', async (req, res) => {
  const admin = await requireRole(req, res, 'admin');
  if (!admin) return;
  const b = await readBody(req);
  for (const [key, value] of Object.entries(b)) {
    await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, JSON.stringify(value));
  }
  await logAudit(admin, 'Update Settings', 'System Settings', `Updated: ${Object.keys(b).join(', ')}`, req);
  sendJson(res, 200, { message: 'Settings updated' });
});

// ============================================================
// HEALTH CHECK
// ============================================================

router.get('/api/health', async (req, res) => {
  sendJson(res, 200, { status: 'ok', time: new Date().toISOString() });
});

// ============================================================
// SERVER
// ============================================================

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    return res.end();
  }
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const match = router.match(req.method, url.pathname);
  if (!match) {
    return sendJson(res, 404, { error: `No route for ${req.method} ${url.pathname}` });
  }
  try {
    await match.handler(req, res, url.searchParams, match.params);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error' });
  }
});

(async () => {
  try {
    await db.initSchema();
    server.listen(PORT, () => {
      console.log(`Alumni Tracer & Donation Management API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
