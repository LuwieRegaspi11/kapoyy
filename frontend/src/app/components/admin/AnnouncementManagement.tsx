import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Pin, X, Megaphone } from 'lucide-react';
import { api } from '../../lib/api';

const DEPARTMENTS = ['All Alumni', 'CSE', 'CTHM', 'BAA', 'CED', 'CN'];
const CATEGORIES = ['General', 'Event Reminder', 'Donation Drive', 'Survey Deadline', 'University Update'];

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  targetDept: string;
  date: string;
  pinned: boolean;
  author: string;
}

const categoryColors: Record<string, string> = {
  'General': 'bg-gray-100 text-gray-700',
  'Event Reminder': 'bg-blue-100 text-blue-700',
  'Donation Drive': 'bg-green-100 text-green-700',
  'Survey Deadline': 'bg-orange-100 text-orange-700',
  'University Update': 'bg-purple-100 text-purple-700',
};

export default function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [filterDept, setFilterDept] = useState('All Alumni');
  const [form, setForm] = useState({ title: '', content: '', category: 'General', targetDept: 'All Alumni' });

  const loadAnnouncements = () => {
    api.get('/announcements').then((res) => setAnnouncements(res.announcements));
  };

  useEffect(() => { loadAnnouncements(); }, []);

  const filtered = announcements.filter(a => filterDept === 'All Alumni' || a.targetDept === filterDept || a.targetDept === 'All Alumni');
  const pinned = filtered.filter(a => a.pinned);
  const rest = filtered.filter(a => !a.pinned);

  const handleSave = async () => {
    if (editTarget) {
      await api.put(`/announcements/${editTarget.id}`, form);
    } else {
      await api.post('/announcements', form);
    }
    setForm({ title: '', content: '', category: 'General', targetDept: 'All Alumni' });
    setShowForm(false); setEditTarget(null);
    loadAnnouncements();
  };

  const togglePin = async (a: Announcement) => {
    await api.put(`/announcements/${a.id}`, { pinned: !a.pinned });
    loadAnnouncements();
  };
  const deleteAnn = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await api.delete(`/announcements/${id}`);
    loadAnnouncements();
  };

  const openEdit = (a: Announcement) => {
    setEditTarget(a);
    setForm({ title: a.title, content: a.content, category: a.category, targetDept: a.targetDept });
    setShowForm(true);
  };

  const AnnouncementCard = ({ a }: { a: Announcement }) => (
    <div className={`bg-white rounded-xl border shadow-sm p-5 ${a.pinned ? 'border-blue-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {a.pinned && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Pin className="w-2.5 h-2.5" /> Pinned</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${categoryColors[a.category]}`}>{a.category}</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.targetDept}</span>
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{a.title}</h4>
          <p className="text-sm text-gray-600 line-clamp-2">{a.content}</p>
          <p className="text-xs text-gray-400 mt-2">{a.date} · by {a.author}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => togglePin(a)} title={a.pinned ? 'Unpin' : 'Pin'}
            className={`p-1.5 rounded-lg transition-colors ${a.pinned ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`}>
            <Pin className="w-4 h-4" />
          </button>
          <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"><Edit className="w-4 h-4" /></button>
          <button onClick={() => deleteAnn(a.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Announcements</h2>
          <p className="text-sm text-gray-500">Post and manage announcements for alumni</p>
        </div>
        <button onClick={() => { setEditTarget(null); setForm({ title: '', content: '', category: 'General', targetDept: 'All Alumni' }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#1B3A6B,#2B5BA8)' }}>
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {DEPARTMENTS.map(d => (
          <button key={d} onClick={() => setFilterDept(d)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${filterDept === d ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={filterDept === d ? { background: 'linear-gradient(135deg,#1B3A6B,#2B5BA8)' } : {}}>
            {d}
          </button>
        ))}
      </div>

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2"><Pin className="w-3.5 h-3.5" /> Pinned</h3>
          {pinned.map(a => <AnnouncementCard key={a.id} a={a} />)}
        </div>
      )}

      {/* All */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2"><Megaphone className="w-3.5 h-3.5" /> All Announcements</h3>
        {rest.length === 0 && <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">No announcements found</div>}
        {rest.map(a => <AnnouncementCard key={a.id} a={a} />)}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-gray-800">{editTarget ? 'Edit Announcement' : 'New Announcement'}</h3>
              <button onClick={() => { setShowForm(false); setEditTarget(null); }}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-400" placeholder="Announcement title" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Content</label>
                <textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))} rows={4}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-400 resize-none" placeholder="Write your announcement..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-400">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Target Department</label>
                  <select value={form.targetDept} onChange={e => setForm(f => ({...f, targetDept: e.target.value}))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-400">
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setShowForm(false); setEditTarget(null); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#1B3A6B,#2B5BA8)' }}>
                {editTarget ? 'Save Changes' : 'Post Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
