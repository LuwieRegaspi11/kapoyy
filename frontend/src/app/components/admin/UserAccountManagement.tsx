import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, RefreshCw, Power } from 'lucide-react';
import { api } from '../../lib/api';

type Role = 'alumni' | 'faculty' | 'representative' | 'admin';

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  status: 'Active' | 'Pending' | 'Deactivated';
  joinDate: string;
  lastLogin: string;
}

const roleColors: Record<Role, string> = {
  admin: 'bg-red-100 text-red-700',
  alumni: 'bg-blue-100 text-blue-700',
  faculty: 'bg-green-100 text-green-700',
  representative: 'bg-purple-100 text-purple-700',
};

const statusColors = {
  Active: 'bg-green-100 text-green-700',
  Pending: 'bg-orange-100 text-orange-700',
  Deactivated: 'bg-gray-100 text-gray-500',
};

export default function UserAccountManagement() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const loadUsers = () => {
    api.get('/users').then((res) => setUsers(res.users.map((u: any) => ({
      ...u, department: u.department || 'All',
    }))));
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.includes(q);
    const matchRole = filterRole === 'All' || u.role === filterRole;
    const matchStatus = filterStatus === 'All' || u.status === filterStatus;
    return matchQ && matchRole && matchStatus;
  });

  const approve = async (id: string) => { await api.put(`/users/${id}`, { status: 'Active' }); loadUsers(); };
  const deactivate = async (u: UserAccount) => {
    if (u.status === 'Active') { await api.delete(`/users/${u.id}`); }
    else { await api.put(`/users/${u.id}`, { status: 'Active' }); }
    loadUsers();
  };

  const pending = users.filter(u => u.status === 'Pending').length;
  const active = users.filter(u => u.status === 'Active').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">User Account Management</h2>
          <p className="text-sm text-gray-500">Approve registrations and manage user accounts</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: '#2B5BA8' },
          { label: 'Active', value: active, color: '#059669' },
          { label: 'Pending Approval', value: pending, color: '#d97706' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" style={{ borderLeftWidth: 3, borderLeftColor: s.color }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
        </div>
        {[
          { label: 'Role', value: filterRole, set: setFilterRole, opts: ['All', 'admin', 'alumni', 'faculty', 'representative'] },
          { label: 'Status', value: filterStatus, set: setFilterStatus, opts: ['All', 'Active', 'Pending', 'Deactivated'] },
        ].map(f => (
          <select key={f.label} value={f.value} onChange={e => f.set(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-400">
            {f.opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['User', 'Role', 'Department', 'Status', 'Joined', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{u.name}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${roleColors[u.role]}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{u.department}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[u.status]}`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.joinDate ? new Date(u.joinDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.lastLogin && u.lastLogin !== 'Never' ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {u.status === 'Pending' && (
                        <button onClick={() => approve(u.id)} title="Approve" className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button title="Reset Password" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      {u.role !== 'admin' && (
                        <button onClick={() => deactivate(u)} title={u.status === 'Active' ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition-colors ${u.status === 'Active' ? 'hover:bg-orange-50 text-orange-600' : 'hover:bg-green-50 text-green-600'}`}>
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
