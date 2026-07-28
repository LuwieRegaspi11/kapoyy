/**
 * Navigation matrix (Batch Representative):
 * Dashboard ✅ | My Profile ✅ | Alumni Directory ✅ | Tracer Surveys ❌
 * Donation Center ✅ | Events/Calendar ✅ | Announcements ✅ | Job Board ✅
 * Audit Logs ❌ | System Settings ❌
 */
import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router';
import { useAuth } from './AuthContext';
import { BarChart3, Users, DollarSign, Calendar, Megaphone, BriefcaseBusiness, Shield } from 'lucide-react';
import { Avatar, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { CheckCircle, Search } from 'lucide-react';
import DashboardLayout from './shared/DashboardLayout';
import ProfilePage from './shared/ProfilePage';
import EventCalendar from './shared/EventCalendar';
import AnnouncementBoard from './shared/AnnouncementBoard';
import JobBoard from './shared/JobBoard';
import { RepDashboardHome } from './shared/RoleDashboardHome';
import RepDonationMonitor from './representative/RepDonationMonitor';
import { api } from '../lib/api';

const NAV_ITEMS = [
  { label: 'Dashboard',         icon: <BarChart3 className="w-4 h-4" />,        path: '' },
  { label: 'Alumni Directory',  icon: <Users className="w-4 h-4" />,             path: 'verification' },
  { label: 'Donation Center',   icon: <DollarSign className="w-4 h-4" />,        path: 'donations' },
  { label: 'Events / Calendar', icon: <Calendar className="w-4 h-4" />,          path: 'events' },
  { label: 'Announcements',     icon: <Megaphone className="w-4 h-4" />,         path: 'announcements' },
  { label: 'Job Board',         icon: <BriefcaseBusiness className="w-4 h-4" />, path: 'jobs' },
  { label: 'Activity Log',      icon: <Shield className="w-4 h-4" />,            path: 'activity' },
];

export default function RepresentativeDashboard() {
  const { user } = useAuth();
  return (
    <DashboardLayout
      title="Representative Portal"
      subtitle={`Batch ${user?.assignedBatchYear} · ${user?.assignedDepartment} Rep`}
      basePath="representative"
      navItems={NAV_ITEMS}
      accentColor="#2B5BA8"
      accentGradient="linear-gradient(135deg, #1B3A6B 0%, #CC2200 50%, #2B5BA8 100%)"
    >
      <Routes>
        <Route index              element={<RepDashboardHome />} />
        <Route path="profile"       element={<ProfilePage />} />
        <Route path="verification"  element={<BatchVerificationView batchYear={user?.assignedBatchYear || 2021} department={user?.assignedDepartment || 'CSE'} program={user?.assignedProgram || 'BSIT'} />} />
        <Route path="donations"     element={<RepDonationMonitor />} />
        <Route path="events"        element={<EventCalendar userRole="faculty" department={user?.assignedDepartment} />} />
        <Route path="announcements" element={<AnnouncementBoard role="representative" department={user?.assignedDepartment} userName={user?.name} />} />
        <Route path="jobs"          element={<JobBoard role="representative" department={user?.assignedDepartment} userName={user?.name} />} />
        <Route path="activity"      element={<ActivityLogView />} />
      </Routes>
    </DashboardLayout>
  );
}

/* ── Batch Verification (Alumni Directory for Rep) ── */
interface BatchAlumni {
  id: string; name: string; email: string; studentId: string;
  department: string; program: string; isBatchVerified: boolean;
  isAdminApproved: boolean; surveyCompleted: boolean; profileImage?: string;
}

function BatchVerificationView({ batchYear, department, program }: { batchYear: number; department: string; program: string }) {
  const [alumni, setAlumni] = useState<BatchAlumni[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BatchAlumni | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const loadPending = () => {
    api.get('/pending-registrations').then((res) => {
      setAlumni(res.registrations.map((p: any) => ({
        id: p.id, name: p.name, email: p.email, studentId: p.studentId || '—',
        department: p.department, program: p.program,
        isBatchVerified: p.isBatchVerified, isAdminApproved: p.status === 'Approved',
        surveyCompleted: false, profileImage: p.profileImage,
      })));
    });
  };

  useEffect(() => { loadPending(); }, []);

  const filtered = alumni.filter(a =>
    a.department === department && a.program === program &&
    (a.name.toLowerCase().includes(search.toLowerCase()) || a.email.includes(search) || a.studentId.includes(search))
  );

  const handleVerify = async () => {
    if (!selected) return;
    setVerifying(true);
    try {
      await api.post(`/pending-registrations/${selected.id}/batch-verify`);
      setDialogOpen(false);
      loadPending();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Alumni Directory</h2>
        <p className="text-sm text-gray-500">Verify Batch {batchYear} {department} {program} members</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-blue-800">Verification Scope</p>
          <p className="text-xs text-blue-600 mt-0.5">You can only verify alumni from <strong>Batch {batchYear} {department} {program}</strong>. All actions are audit-logged per RA 10175.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or student ID..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Users className="w-7 h-7 text-gray-300" />
            </div>
            <h3 className="font-semibold text-gray-500 mb-1">No Batch Members Found</h3>
            <p className="text-sm text-gray-400 max-w-xs">No alumni from Batch {batchYear} {department} {program} have registered yet. Once they register, they will appear here for your verification.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Alumni','Student ID','Program','Batch Verified','Admin Approved','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={a.profileImage} alt={a.name} sx={{ width: 32, height: 32 }} />
                        <div>
                          <p className="font-semibold text-gray-800">{a.name}</p>
                          <p className="text-xs text-gray-400">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.studentId}</td>
                    <td className="px-4 py-3 text-gray-600">{a.program}</td>
                    <td className="px-4 py-3"><Chip label={a.isBatchVerified ? 'Verified' : 'Pending'} size="small" color={a.isBatchVerified ? 'info' : 'warning'} /></td>
                    <td className="px-4 py-3"><Chip label={a.isAdminApproved ? 'Approved' : 'Pending'} size="small" color={a.isAdminApproved ? 'success' : 'default'} /></td>
                    <td className="px-4 py-3">
                      <Button size="small" onClick={() => { setSelected(a); setDialogOpen(true); }}>Review</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Verify Batch Member</DialogTitle>
        <DialogContent>
          {selected && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <Avatar src={selected.profileImage} alt={selected.name} sx={{ width: 64, height: 64 }} />
                <div>
                  <h3 className="text-lg font-bold">{selected.name}</h3>
                  <p className="text-gray-500 text-sm">{selected.email}</p>
                  <p className="text-xs text-gray-400">Student ID: {selected.studentId}</p>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-xs text-yellow-800"><strong>⚠️ Verification Responsibility:</strong> By verifying, you confirm this person is a genuine member of Batch {batchYear} {department} {program}. This is logged in the audit trail.</p>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          {selected && !selected.isBatchVerified && (
            <Button variant="contained" color="success" startIcon={<CheckCircle className="w-4 h-4" />} onClick={handleVerify} disabled={verifying}>
              {verifying ? 'Verifying…' : 'Verify Batch Mate'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
}

/* ── Activity Log ── */
function ActivityLogView() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get('/audit-logs').then((res) => setLogs(res.logs)).catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Activity Log</h2>
        <p className="text-sm text-gray-500">RA 10175 compliant audit trail of all your actions</p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">Per RA 10175 (Cybercrime Prevention Act), all verification actions are timestamped, logged, and cannot be deleted. These logs are accessible to administrators.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Shield className="w-7 h-7 text-gray-300" />
            </div>
            <h3 className="font-semibold text-gray-500 mb-1">No Activity Yet</h3>
            <p className="text-sm text-gray-400 max-w-xs">Your verification actions will appear here. Start by reviewing your assigned batch members in the Alumni Directory.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{log.action}</p>
                  <p className="text-xs text-gray-400">{log.module} · {log.details}</p>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0 ml-4">{new Date(log.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
