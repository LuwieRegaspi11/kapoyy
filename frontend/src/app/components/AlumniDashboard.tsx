/**
 * Navigation matrix (Alumni):
 * Dashboard ✅ | My Profile ✅ | Alumni Directory ❌ | Tracer Surveys ✅
 * Donation Center ✅ | Events/Calendar ✅ | Announcements ✅ | Job Board ✅
 * Audit Logs ❌ | System Settings ❌
 */
import React from 'react';
import { Routes, Route } from 'react-router';
import { useAuth } from './AuthContext';
import { BarChart3, DollarSign, Calendar, Megaphone, BriefcaseBusiness, ClipboardList, TrendingUp } from 'lucide-react';
import DashboardLayout from './shared/DashboardLayout';
import AlumniDashboardHome from './alumni/AlumniDashboardHome';
import ProfilePage from './shared/ProfilePage';
import DonationPortal from './alumni/DonationPortal';
import EventsView from './alumni/EventsView';
import AnnouncementBoard from './shared/AnnouncementBoard';
import JobBoard from './shared/JobBoard';
import EmploymentTracking from './alumni/EmploymentTracking';
import TracerSurveyAlumni from './alumni/TracerSurveyAlumni';

const NAV_ITEMS = [
  { label: 'Dashboard',              icon: <BarChart3 className="w-4 h-4" />,       path: '' },
{ label: 'Donation Center',        icon: <DollarSign className="w-4 h-4" />,       path: 'donations' },
  { label: 'Events / Calendar',      icon: <Calendar className="w-4 h-4" />,         path: 'events' },
  { label: 'Announcements',          icon: <Megaphone className="w-4 h-4" />,        path: 'announcements' },
  { label: 'Job Board',              icon: <BriefcaseBusiness className="w-4 h-4" />,path: 'jobs' },
  { label: 'Employment Tracking',    icon: <TrendingUp className="w-4 h-4" />,       path: 'employment' },
  { label: 'Tracer Survey',          icon: <ClipboardList className="w-4 h-4" />,    path: 'tracer-survey' },
];

export default function AlumniDashboard() {
  const { user } = useAuth();
  return (
    <DashboardLayout
      title="Alumni Portal"
      basePath="alumni"
      navItems={NAV_ITEMS}
      accentColor="#2B5BA8"
      accentGradient="linear-gradient(135deg, #1B3A6B 0%, #2B5BA8 55%, #5B9BD5 100%)"
    >
      <Routes>
        <Route index element={<AlumniDashboardHome />} />
        <Route path="profile"       element={<ProfilePage />} />
<Route path="donations"     element={<DonationPortal />} />
        <Route path="events"        element={<EventsView />} />
        <Route path="announcements" element={<AnnouncementBoard role="alumni" department={user?.department} userName={user?.name} />} />
        <Route path="jobs"          element={<JobBoard role="alumni" department={user?.department} userName={user?.name} />} />
        <Route path="employment"    element={<EmploymentTracking />} />
        <Route path="tracer-survey" element={<TracerSurveyAlumni />} />
      </Routes>
    </DashboardLayout>
  );
}
