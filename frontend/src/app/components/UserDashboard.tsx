/**
 * Navigation matrix (Faculty):
 * Dashboard ✅ | My Profile ✅ | Alumni Directory ✅ | Tracer Surveys ✅
 * Donation Center ✅ | Events/Calendar ✅ | Announcements ✅ | Job Board ✅
 * Audit Logs ❌ | System Settings ❌
 */
import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router';
import { useAuth } from './AuthContext';
import { BarChart3, Users, DollarSign, Calendar, Megaphone, BriefcaseBusiness, Search, Download, FileText } from 'lucide-react';
import { TextField, Chip } from '@mui/material';
import DashboardLayout from './shared/DashboardLayout';
import ProfilePage from './shared/ProfilePage';
import EventCalendar from './shared/EventCalendar';
import AnnouncementBoard from './shared/AnnouncementBoard';
import JobBoard from './shared/JobBoard';
import { api } from '../lib/api';
import TracerSurveys from './admin/TracerSurveys';
import { FacultyDashboardHome } from './shared/RoleDashboardHome';
import FacultyDonationMonitor from './faculty/FacultyDonationMonitor';

const NAV_ITEMS = [
  { label: 'Dashboard',         icon: <BarChart3 className="w-4 h-4" />,        path: '' },
  { label: 'Alumni Directory',  icon: <Users className="w-4 h-4" />,             path: 'directory' },
{ label: 'Donation Center',   icon: <DollarSign className="w-4 h-4" />,        path: 'donations' },
  { label: 'Events / Calendar', icon: <Calendar className="w-4 h-4" />,          path: 'calendar' },
  { label: 'Announcements',     icon: <Megaphone className="w-4 h-4" />,         path: 'announcements' },
  { label: 'Job Board',         icon: <BriefcaseBusiness className="w-4 h-4" />, path: 'jobs' },
  { label: 'Tracer Surveys',    icon: <FileText className="w-4 h-4" />,          path: 'tracer-surveys' },
];

export default function UserDashboard() {
  const { user } = useAuth();
  return (
    <DashboardLayout
      title="Faculty Portal"
      subtitle={`Welcome, ${user?.name} — ${user?.department} Dept.`}
      basePath="user"
      navItems={NAV_ITEMS}
      accentColor="#CC2200"
      accentGradient="linear-gradient(135deg, #1B3A6B 0%, #CC2200 60%, #e63300 100%)"
    >
      <Routes>
        <Route index          element={<FacultyDashboardHome />} />
        <Route path="profile"       element={<ProfilePage />} />
        <Route path="directory"     element={<AlumniDirectoryView />} />
<Route path="donations"     element={<FacultyDonationMonitor />} />
        <Route path="calendar"      element={<FacultyCalendar />} />
        <Route path="announcements" element={<AnnouncementBoard role="faculty" department={user?.department} userName={user?.name} />} />
        <Route path="jobs"          element={<JobBoard role="faculty" department={user?.department} userName={user?.name} />} />
        <Route path="tracer-surveys" element={<TracerSurveys />} />
      </Routes>
    </DashboardLayout>
  );
}

/* ── Alumni Directory (Dept-locked) ── */
function AlumniDirectoryView() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('All');
  const [alumni, setAlumni] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.department) return;
    api.get(`/alumni?department=${encodeURIComponent(user.department)}`).then((res) => setAlumni(res.alumni));
  }, [user?.department]);

  const filtered = alumni.filter((a) => {
    const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase());
    const matchesYear = filterYear === 'All' || a.batchYear?.toString() === filterYear;
    return matchesSearch && matchesYear;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Alumni Directory</h2>
          <p className="text-sm text-gray-500">Viewing <strong>{user?.department}</strong> department alumni only</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
        <span className="text-amber-600 text-sm">🔒</span>
        <p className="text-xs text-amber-700 font-medium">You can only view alumni from the <strong>{user?.department}</strong> department. Contact Admin for cross-department access.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search alumni by name, student ID, or email..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
        </div>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none">
          {['All','2018','2019','2020','2021','2022'].map(y => <option key={y}>{y}</option>)}
        </select>
        <TextField disabled label="Department" value={user?.department || ''} size="small" sx={{ width: 160 }} helperText="Locked to your dept." />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Users className="w-7 h-7 text-gray-300" />
            </div>
            <h3 className="font-semibold text-gray-500 mb-1">No Records Found</h3>
            <p className="text-sm text-gray-400 max-w-xs">No alumni records match your search. Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Name','Program','Batch Year','Employment','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{a.name}</td>
                    <td className="px-4 py-3 text-gray-600">{a.program}</td>
                    <td className="px-4 py-3 text-gray-600">{a.batchYear}</td>
                    <td className="px-4 py-3"><Chip label={a.employmentStatus} size="small" /></td>
                    <td className="px-4 py-3"><Chip label={a.verified ? 'Verified' : 'Unverified'} size="small" color={a.verified ? 'success' : 'warning'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FacultyCalendar() {
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Events / Calendar</h2>
        <p className="text-sm text-gray-500">Manage events for <strong>{user?.department}</strong> department. All events are visible on the shared calendar.</p>
      </div>
      <EventCalendar userRole="faculty" department={user?.department} canCreate={true} createdBy="faculty" />
    </div>
  );
}
