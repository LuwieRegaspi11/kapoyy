import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { FileText, Download, TrendingUp, Users, DollarSign, GraduationCap } from 'lucide-react';
import { useDarkMode } from '../shared/DarkModeContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../lib/api';

const EMPLOYMENT_COLORS: Record<string, string> = {
  Employed: '#10b981', 'Self-Employed': '#3b82f6', Unemployed: '#ef4444', 'Pursuing Studies': '#8b5cf6', Unreported: '#9ca3af',
};

export default function Reports() {
  const { dark } = useDarkMode();
  const [reportType, setReportType] = useState('employment');
  const [department, setDepartment] = useState('All');

  const [employmentData, setEmploymentData] = useState<any[]>([]);
  const [donationTrend, setDonationTrend] = useState<{ month: string; amount: number }[]>([]);
  const [alumniByYear, setAlumniByYear] = useState<{ year: string; count: number }[]>([]);
  const [employmentStatusData, setEmploymentStatusData] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    // Employment status by department + overall, and alumni by batch year,
    // derived from the live alumni directory.
    api.get('/alumni').then((res) => {
      const alumni: any[] = res.alumni;
      const byDept: Record<string, any> = {};
      const byStatus: Record<string, number> = {};
      const byYear: Record<string, number> = {};
      for (const a of alumni) {
        const dept = a.department || 'Unassigned';
        byDept[dept] = byDept[dept] || { department: dept, employed: 0, selfEmployed: 0, unemployed: 0, studying: 0 };
        const status = a.employmentStatus || 'Unemployed';
        if (status === 'Employed') byDept[dept].employed++;
        else if (status === 'Self-Employed') byDept[dept].selfEmployed++;
        else if (status === 'Pursuing Studies') byDept[dept].studying++;
        else byDept[dept].unemployed++;
        byStatus[status] = (byStatus[status] || 0) + 1;
        byYear[a.batchYear] = (byYear[a.batchYear] || 0) + 1;
      }
      setEmploymentData(Object.values(byDept));
      setEmploymentStatusData(Object.entries(byStatus).map(([name, value]) => ({ name, value, color: EMPLOYMENT_COLORS[name] || '#9ca3af' })));
      setAlumniByYear(Object.entries(byYear).map(([year, count]) => ({ year, count })).sort((a, b) => a.year.localeCompare(b.year)));
    });

    // Donation totals per month, from verified donations.
    api.get('/donations?status=Verified').then((res) => {
      const byMonth: Record<string, number> = {};
      for (const d of res.donations) {
        const month = new Date(d.submittedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        byMonth[month] = (byMonth[month] || 0) + d.amount;
      }
      setDonationTrend(Object.entries(byMonth).map(([month, amount]) => ({ month, amount })));
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl mb-1">Reports & Analytics</h2>
          <p className="text-gray-600">Departmental analytics and automated reporting</p>
        </div>
        <Button
          variant="contained"
          startIcon={<Download className="w-4 h-4" />}
          className="bg-blue-600"
        >
          Export All Reports
        </Button>
      </div>

      {/* Quick Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <GraduationCap className="w-8 h-8 text-blue-500" />
              <Download className="w-4 h-4 text-gray-400" />
            </div>
            <h4 className="text-sm mb-1">Employment Tracer</h4>
            <p className="text-xs text-gray-600">Annual accreditation report</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-8 h-8 text-green-500" />
              <Download className="w-4 h-4 text-gray-400" />
            </div>
            <h4 className="text-sm mb-1">Donation Summary</h4>
            <p className="text-xs text-gray-600">Financial contributions report</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <Users className="w-8 h-8 text-purple-500" />
              <Download className="w-4 h-4 text-gray-400" />
            </div>
            <h4 className="text-sm mb-1">Alumni Directory</h4>
            <p className="text-xs text-gray-600">Complete alumni listing</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-8 h-8 text-orange-500" />
              <Download className="w-4 h-4 text-gray-400" />
            </div>
            <h4 className="text-sm mb-1">Analytics Dashboard</h4>
            <p className="text-xs text-gray-600">Comprehensive analytics PDF</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select value={reportType} onChange={(e) => setReportType(e.target.value)} label="Report Type">
                <MenuItem value="employment">Employment Status</MenuItem>
                <MenuItem value="donations">Donation Trends</MenuItem>
                <MenuItem value="alumni">Alumni Distribution</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select value={department} onChange={(e) => setDepartment(e.target.value)} label="Department">
                <MenuItem value="All">All Departments</MenuItem>
                <MenuItem value="CSE">CSE</MenuItem>
                <MenuItem value="CTHM">CTHM</MenuItem>
                <MenuItem value="BAA">BAA</MenuItem>
              </Select>
            </FormControl>
            <Button variant="outlined" fullWidth className="h-14">
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employment Status Chart */}
      <Card>
        <CardContent>
          <h3 className="text-lg mb-4">Employment Status by Department</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={employmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#334155' : '#e5e7eb'} />
              <XAxis dataKey="department" tick={{ fill: dark ? '#b8d4f0' : '#4b5563' }} axisLine={{ stroke: dark ? '#334155' : '#d1d5db' }} />
              <YAxis tick={{ fill: dark ? '#b8d4f0' : '#4b5563' }} axisLine={{ stroke: dark ? '#334155' : '#d1d5db' }} />
              <Tooltip contentStyle={{ background: dark ? '#1a2332' : '#ffffff', border: `1px solid ${dark ? '#334155' : '#e5e7eb'}`, borderRadius: 8, color: dark ? '#e8f2ff' : '#111827' }} />
              <Legend wrapperStyle={{ color: dark ? '#b8d4f0' : '#4b5563' }} />
              <Bar dataKey="employed" fill="#10b981" name="Employed" />
              <Bar dataKey="selfEmployed" fill="#3b82f6" name="Self-Employed" />
              <Bar dataKey="unemployed" fill="#ef4444" name="Unemployed" />
              <Bar dataKey="studying" fill="#8b5cf6" name="Pursuing Studies" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donation Trends */}
        <Card>
          <CardContent>
            <h3 className="text-lg mb-4">Donation Trends (2026)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={donationTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#334155' : '#e5e7eb'} />
                <XAxis dataKey="month" tick={{ fill: dark ? '#b8d4f0' : '#4b5563' }} axisLine={{ stroke: dark ? '#334155' : '#d1d5db' }} />
                <YAxis tick={{ fill: dark ? '#b8d4f0' : '#4b5563' }} axisLine={{ stroke: dark ? '#334155' : '#d1d5db' }} />
                <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} />
                <Legend wrapperStyle={{ color: dark ? '#b8d4f0' : '#4b5563' }} />
                <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} name="Donations (₱)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Overall Employment Status */}
        <Card>
          <CardContent>
            <h3 className="text-lg mb-4">Overall Employment Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={employmentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {employmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: dark ? '#1a2332' : '#ffffff', border: `1px solid ${dark ? '#334155' : '#e5e7eb'}`, borderRadius: 8, color: dark ? '#e8f2ff' : '#111827' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
              {employmentStatusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alumni Distribution */}
      <Card>
        <CardContent>
          <h3 className="text-lg mb-4">Alumni Distribution by Batch Year</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={alumniByYear}>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#334155' : '#e5e7eb'} />
              <XAxis dataKey="year" tick={{ fill: dark ? '#b8d4f0' : '#4b5563' }} axisLine={{ stroke: dark ? '#334155' : '#d1d5db' }} />
              <YAxis tick={{ fill: dark ? '#b8d4f0' : '#4b5563' }} axisLine={{ stroke: dark ? '#334155' : '#d1d5db' }} />
              <Tooltip contentStyle={{ background: dark ? '#1a2332' : '#ffffff', border: `1px solid ${dark ? '#334155' : '#e5e7eb'}`, borderRadius: 8, color: dark ? '#e8f2ff' : '#111827' }} />
              <Legend wrapperStyle={{ color: dark ? '#b8d4f0' : '#4b5563' }} />
              <Bar dataKey="count" fill="#3b82f6" name="Number of Alumni" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* One-Click Report Templates */}
      <Card>
        <CardContent>
          <h3 className="text-lg mb-4">One-Click Report Generation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm mb-1">Accreditation Report 2026</h4>
                  <p className="text-xs text-gray-600">Complete employment tracer for accreditation requirements</p>
                </div>
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
              <Button variant="outlined" size="small" fullWidth className="mt-2">
                Generate PDF
              </Button>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm mb-1">Donor Appreciation Letters</h4>
                  <p className="text-xs text-gray-600">Auto-generate thank you letters for all verified donations</p>
                </div>
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
              <Button variant="outlined" size="small" fullWidth className="mt-2">
                Generate Letters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
