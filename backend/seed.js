// seed.js — populates the database with the same demo accounts and sample data
// that used to be hardcoded in the frontend's AuthContext / DonationContext / etc.
// Run with: node seed.js
// Requires DATABASE_URL to be set (see db.js / README for the Supabase connection string).
'use strict';

const db = require('./db');
const { hashPassword } = require('./auth');

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function upsertUser(u) {
  const exists = await db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
  if (exists) return exists.id;
  const { hash, salt } = hashPassword(u.password);
  const id = genId('usr');
  await db.prepare(`INSERT INTO users
    (id,name,email,password_hash,password_salt,role,department,program,batch_year,profile_image,
     assigned_batch_year,assigned_department,assigned_program,status,verified)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, u.name, u.email, hash, salt, u.role, u.department || null, u.program || null,
    u.batchYear || null, u.profileImage || null,
    u.assignedBatchYear || null, u.assignedDepartment || null, u.assignedProgram || null,
    'Active', u.verified ? 1 : 0
  );
  return id;
}

async function main() {
  console.log('Initializing schema (creates tables if they do not exist yet)...');
  await db.initSchema();

  console.log('Seeding database...');

  const adminId = await upsertUser({
    name: 'Admin User', email: 'admin@asiancollege.edu', password: 'admin123', role: 'admin',
    profileImage: 'https://ui-avatars.com/api/?name=Admin+User&background=1B3A6B&color=fff', verified: true,
  });

  const alumniId = await upsertUser({
    name: 'Maria Santos', email: 'alumni@asiancollege.edu', password: 'alumni123', role: 'alumni',
    department: 'CSE', batchYear: 2022, program: 'BSIT',
    profileImage: 'https://ui-avatars.com/api/?name=Maria+Santos&background=5B9BD5&color=fff', verified: true,
  });

  const repId = await upsertUser({
    name: 'Juan Dela Cruz', email: 'rep@asiancollege.edu', password: 'rep123', role: 'representative',
    department: 'CSE', batchYear: 2022, program: 'BSIT',
    assignedBatchYear: 2022, assignedDepartment: 'CSE', assignedProgram: 'BSIT',
    profileImage: 'https://ui-avatars.com/api/?name=Juan+Dela+Cruz&background=2B5BA8&color=fff', verified: true,
  });

  const facultyId = await upsertUser({
    name: 'Prof. Ana Reyes', email: 'faculty@asiancollege.edu', password: 'faculty123', role: 'faculty',
    department: 'CSE',
    profileImage: 'https://ui-avatars.com/api/?name=Ana+Reyes&background=CC2200&color=fff', verified: true,
  });

  // Representative record
  if (!(await db.prepare('SELECT id FROM representatives WHERE user_id = ?').get(repId))) {
    await db.prepare(`INSERT INTO representatives (id,user_id,name,email,batch_year,department,program,verifications_count,profile_image,status)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      genId('rep'), repId, 'Juan Dela Cruz', 'rep@asiancollege.edu', 2022, 'CSE', 'BSIT', 0,
      'https://ui-avatars.com/api/?name=Juan+Dela+Cruz&background=2B5BA8&color=fff', 'Active'
    );
  }

  // Departments
  const departments = [
    { code: 'CSE', name: 'College of Science and Engineering', dean: 'Dr. Ramon Villanueva', programs: ['BSIT', 'BSCS', 'BSCE'] },
    { code: 'CTHM', name: 'College of Tourism and Hospitality Management', dean: 'Dr. Corazon Lim', programs: ['BSHM', 'BSTM'] },
    { code: 'BAA', name: 'College of Business Administration and Accountancy', dean: 'Dr. Ferdinand Cruz', programs: ['BSA', 'BSBA'] },
  ];
  for (const d of departments) {
    if (!(await db.prepare('SELECT id FROM departments WHERE code = ?').get(d.code))) {
      await db.prepare('INSERT INTO departments (id,code,name,dean,active,programs) VALUES (?,?,?,?,1,?)')
        .run(genId('dept'), d.code, d.name, d.dean, JSON.stringify(d.programs));
    }
  }

  // Campaigns
  const campaigns = [
    { name: 'Scholarship Fund', description: 'Support financially challenged students', target: 200000, current: 145000, department: 'All', deadline: '2026-08-31' },
    { name: 'Lab Upgrade 2026', description: 'Modernize computer labs with new equipment', target: 500000, current: 325000, department: 'CSE', deadline: '2026-09-30' },
    { name: 'Library Books', description: 'Expand library collection with latest textbooks', target: 100000, current: 78000, department: 'All', deadline: null },
    { name: 'Sports Equipment', description: 'Purchase new sports equipment for student athletes', target: 150000, current: 52000, department: 'All', deadline: null },
  ];
  for (const c of campaigns) {
    if (!(await db.prepare('SELECT id FROM campaigns WHERE name = ?').get(c.name))) {
      await db.prepare('INSERT INTO campaigns (id,name,description,target,current,department,active,deadline) VALUES (?,?,?,?,?,?,1,?)')
        .run(genId('camp'), c.name, c.description, c.target, c.current, c.department, c.deadline);
    }
  }

  // Donations
  const donationCount = (await db.prepare('SELECT COUNT(*)::int AS c FROM donations').get()).c;
  if (Number(donationCount) === 0) {
    const donations = [
      { alumni_id: null, alumniName: 'Juan Dela Cruz', alumniEmail: 'juan@gmail.com', department: 'CSE', campaign: 'Scholarship Fund', amount: 5000, type: 'Cash', description: '', proofUrl: 'https://placehold.co/400x300', status: 'Pending', submittedAt: '2026-06-10' },
      { alumni_id: alumniId, alumniName: 'Maria Santos', alumniEmail: 'maria@gmail.com', department: 'CSE', campaign: 'Lab Upgrade 2026', amount: 2500, type: 'Cash', description: '', proofUrl: 'https://placehold.co/400x300', status: 'Verified', submittedAt: '2026-06-09', verifiedAt: '2026-06-10', verifiedBy: 'Admin' },
      { alumni_id: null, alumniName: 'Pedro Reyes', alumniEmail: 'pedro@gmail.com', department: 'CTHM', campaign: 'Library Books', amount: 10000, type: 'Cash', description: '', proofUrl: 'https://placehold.co/400x300', status: 'Verified', submittedAt: '2026-06-08', verifiedAt: '2026-06-09', verifiedBy: 'Admin' },
      { alumni_id: null, alumniName: 'Lisa Chen', alumniEmail: 'lisa@gmail.com', department: 'BAA', campaign: 'Scholarship Fund', amount: 0, type: 'In-Kind', description: '10 STEM textbooks donated to the library', proofUrl: null, status: 'Pending', submittedAt: '2026-06-07' },
    ];
    for (const d of donations) {
      await db.prepare(`INSERT INTO donations
        (id,alumni_id,alumni_name,alumni_email,department,campaign,amount,type,description,proof_url,status,submitted_at,verified_at,verified_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        genId('don'), d.alumni_id, d.alumniName, d.alumniEmail, d.department, d.campaign, d.amount, d.type,
        d.description, d.proofUrl, d.status, d.submittedAt, d.verifiedAt || null, d.verifiedBy || null
      );
    }
  }

  // Jobs
  const jobCount = (await db.prepare('SELECT COUNT(*)::int AS c FROM jobs').get()).c;
  if (Number(jobCount) === 0) {
    const jobs = [
      { title: 'Software Engineer', company: 'TechCorp Philippines', location: 'Cebu City', type: 'Full-time', department: 'CSE', description: 'Develop and maintain web applications using React and Node.js.', requirements: 'BS Computer Science or IT, 1-2 years experience, React, Node.js', postedBy: 'Admin', postedByRole: 'admin', postedAt: '2026-06-10', active: 1, status: 'Active' },
      { title: 'Hotel Front Desk Officer', company: 'Grand Palms Hotel', location: 'Dumaguete City', type: 'Full-time', department: 'CTHM', description: 'Handle guest check-in/check-out and provide excellent customer service.', requirements: 'BSHM graduate, good communication skills, customer service oriented', postedBy: 'Prof. Ana Reyes', postedByRole: 'faculty', postedAt: '2026-06-09', active: 1, status: 'Active' },
      { title: 'Accounting Staff', company: 'SME Finance Corp', location: 'Dumaguete City', type: 'Full-time', department: 'BAA', description: 'Handle accounts payable/receivable and financial reporting.', requirements: 'BSA or BSBA graduate, CPA preferred, MS Excel proficient', postedBy: 'Admin', postedByRole: 'admin', postedAt: '2026-06-08', active: 1, status: 'Active' },
      { title: 'IT Support Specialist', company: 'Digital Solutions Inc.', location: 'Remote', type: 'Remote', department: 'CSE', description: 'Provide technical support and maintain IT infrastructure.', requirements: 'BSIT graduate, networking knowledge, troubleshooting skills', postedBy: 'Maria Santos', postedByRole: 'alumni', postedAt: '2026-06-07', active: 0, suggestedBy: 'Maria Santos', status: 'Pending' },
    ];
    for (const j of jobs) {
      await db.prepare(`INSERT INTO jobs
        (id,title,company,location,type,department,description,requirements,posted_by,posted_by_role,posted_at,active,suggested_by,status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        genId('job'), j.title, j.company, j.location, j.type, j.department, j.description, j.requirements,
        j.postedBy, j.postedByRole, j.postedAt, j.active, j.suggestedBy || null, j.status
      );
    }
  }

  // Notifications
  const notifCount = (await db.prepare('SELECT COUNT(*)::int AS c FROM notifications').get()).c;
  if (Number(notifCount) === 0) {
    const notifications = [
      { title: 'Donation Verified', message: 'Your donation of \u20b15,000 to Scholarship Fund has been verified.', type: 'success', targetRole: 'alumni', createdAt: '2026-06-10' },
      { title: 'New Event Published', message: 'Alumni Homecoming 2026 has been scheduled for June 25.', type: 'info', targetRole: null, createdAt: '2026-06-09' },
      { title: 'Survey Deadline Reminder', message: 'The tracer survey closes on July 15. Please complete it soon.', type: 'warning', targetRole: 'alumni', createdAt: '2026-06-08' },
      { title: 'Pending Registration', message: '2 new alumni registrations need your approval.', type: 'warning', targetRole: 'admin', createdAt: '2026-06-10' },
      { title: 'Donation Submitted', message: 'A new donation from Juan Dela Cruz is pending verification.', type: 'info', targetRole: 'admin', createdAt: '2026-06-10' },
      { title: 'New Batch Member Registered', message: 'A member of your batch has registered and needs verification.', type: 'info', targetRole: 'representative', createdAt: '2026-06-09' },
    ];
    for (const n of notifications) {
      await db.prepare(`INSERT INTO notifications (id,title,message,type,target_role,target_dept,read,created_at)
        VALUES (?,?,?,?,?,?,0,?)`).run(
        genId('notif'), n.title, n.message, n.type, n.targetRole, n.targetDept || null, n.createdAt
      );
    }
  }

  // A sample tracer survey
  const surveyCount = (await db.prepare('SELECT COUNT(*)::int AS c FROM surveys').get()).c;
  if (Number(surveyCount) === 0) {
    await db.prepare(`INSERT INTO surveys (id,title,description,target_dept,target_year,questions,total_sent,total_responses,status,created_date)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      genId('srv'), '2026 Alumni Employment Tracer Survey',
      'Annual survey tracking graduate employment outcomes and further studies.',
      'All', 'All',
      JSON.stringify([
        { id: 'q1', question: 'What is your current employment status?', type: 'select', options: ['Employed', 'Unemployed', 'Self-Employed', 'Pursuing Studies'] },
        { id: 'q2', question: 'How relevant is your current job to your degree?', type: 'select', options: ['Highly Relevant', 'Somewhat Relevant', 'Not Relevant'] },
        { id: 'q3', question: 'Any additional comments?', type: 'text' },
      ]),
      120, 1, 'Active', '2026-06-01'
    );
  }

  // Sample event
  const eventCount = (await db.prepare('SELECT COUNT(*)::int AS c FROM events').get()).c;
  if (Number(eventCount) === 0) {
    await db.prepare(`INSERT INTO events (id,title,description,date,time,location,department,created_by,registered_count,max_capacity,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
      genId('evt'), 'Alumni Homecoming 2026', 'Annual alumni homecoming and networking night.',
      '2026-08-25', '18:00', 'Asian College Gymnasium', 'All', 'Admin User', 0, 300, 'Upcoming'
    );
  }

  console.log('Seed complete. Demo accounts:');
  console.log('  admin@asiancollege.edu / admin123');
  console.log('  alumni@asiancollege.edu / alumni123');
  console.log('  rep@asiancollege.edu / rep123');
  console.log('  faculty@asiancollege.edu / faculty123');

  await db.pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
