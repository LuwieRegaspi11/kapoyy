import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, DollarSign, Plus, Eye, X, TrendingUp, Users } from 'lucide-react';
import { useDonations } from '../shared/DonationContext';
import { useNotifications } from '../shared/NotificationContext';

const statusConfig = {
  Pending:  { color: 'bg-orange-100 text-orange-700', icon: <Clock className="w-3.5 h-3.5" /> },
  Verified: { color: 'bg-green-100 text-green-700',   icon: <CheckCircle className="w-3.5 h-3.5" /> },
  Rejected: { color: 'bg-red-100 text-red-700',       icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function DonationManagement() {
  const { donations, campaigns, verifyDonation, rejectDonation, addCampaign } = useDonations();
  const { trigger } = useNotifications();
  const [tab, setTab] = useState<'transactions' | 'campaigns'>('transactions');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [viewProof, setViewProof] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ name: '', description: '', target: '', department: 'All', deadline: '' });

  const filtered = donations.filter(d => {
    const matchStatus = filterStatus === 'All' || d.status === filterStatus;
    const matchDept = filterDept === 'All' || d.department === filterDept;
    return matchStatus && matchDept;
  });

  const pending = donations.filter(d => d.status === 'Pending').length;
  const totalVerified = donations.filter(d => d.status === 'Verified').reduce((s, d) => s + d.amount, 0);

  const handleVerify = (id: string) => {
    verifyDonation(id, 'Admin');
    trigger({ title: 'Donation Verified', message: 'Your donation has been verified. Thank you for your support!', type: 'success', targetRole: 'alumni' });
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    rejectDonation(rejectTarget, rejectReason, 'Admin');
    trigger({ title: 'Donation Update', message: 'Your donation submission needs attention. Please check your donation history.', type: 'warning', targetRole: 'alumni' });
    setRejectTarget(null); setRejectReason('');
  };

  const handleAddCampaign = () => {
    addCampaign({ name: campaignForm.name, description: campaignForm.description, target: parseInt(campaignForm.target) || 0, department: campaignForm.department, deadline: campaignForm.deadline, active: true });
    setShowCampaignForm(false);
    setCampaignForm({ name: '', description: '', target: '', department: 'All', deadline: '' });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Donation Management</h2>
          <p className="text-sm text-gray-500">Manage campaigns, verify transactions, and generate reports</p>
        </div>
        {tab === 'campaigns' && (
          <button onClick={() => setShowCampaignForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#1B3A6B,#2B5BA8)' }}>
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Received', value: `₱${totalVerified.toLocaleString()}`, color: '#059669', icon: <DollarSign className="w-5 h-5" /> },
          { label: 'Pending Verification', value: pending, color: '#d97706', icon: <Clock className="w-5 h-5" /> },
          { label: 'Active Campaigns', value: campaigns.filter(c => c.active).length, color: '#2B5BA8', icon: <TrendingUp className="w-5 h-5" /> },
          { label: 'Total Donors', value: new Set(donations.map(d => d.alumniEmail)).size, color: '#7c3aed', icon: <Users className="w-5 h-5" /> },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" style={{ borderLeftWidth: 3, borderLeftColor: s.color }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{s.label}</span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['transactions', 'campaigns'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'transactions' && (
        <div className="space-y-4">
          {pending > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-orange-800">{pending} donation{pending > 1 ? 's' : ''} pending verification — review proof of payment below.</p>
            </div>
          )}
          <div className="flex gap-3 flex-wrap">
            {['All','Pending','Verified','Rejected'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterStatus === s ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={filterStatus === s ? { background: 'linear-gradient(135deg,#1B3A6B,#2B5BA8)' } : {}}>
                {s}
              </button>
            ))}
            <div className="w-px bg-gray-200 mx-1" />
            {['All','CSE','CTHM','BAA'].map(d => (
              <button key={d} onClick={() => setFilterDept(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterDept === d ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {d}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3"><DollarSign className="w-7 h-7 text-gray-300" /></div>
                <p className="font-semibold text-gray-500">No transactions found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>{['Donor','Dept','Campaign','Amount','Type','Submitted','Status','Proof','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">{d.alumniName}</p>
                          <p className="text-xs text-gray-400">{d.alumniEmail}</p>
                        </td>
                        <td className="px-4 py-3"><span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{d.department}</span></td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{d.campaign}</td>
                        <td className="px-4 py-3 font-bold text-gray-800">{d.type === 'Cash' ? `₱${d.amount.toLocaleString()}` : 'In-Kind'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{d.type}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{d.submittedAt}</td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold w-fit ${statusConfig[d.status].color}`}>
                            {statusConfig[d.status].icon} {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {d.proofUrl ? (
                            <button onClick={() => setViewProof(d.proofUrl)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                          ) : <span className="text-xs text-gray-400">N/A</span>}
                        </td>
                        <td className="px-4 py-3">
                          {d.status === 'Pending' && (
                            <div className="flex gap-1">
                              <button onClick={() => handleVerify(d.id)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"><CheckCircle className="w-4 h-4" /></button>
                              <button onClick={() => setRejectTarget(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><XCircle className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.length === 0 ? (
            <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center py-14 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3"><TrendingUp className="w-7 h-7 text-gray-300" /></div>
              <p className="font-semibold text-gray-500">No campaigns yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first fundraising campaign.</p>
            </div>
          ) : campaigns.map(c => {
            const pct = Math.min((c.current / c.target) * 100, 100);
            return (
              <div key={c.id} className={`bg-white rounded-xl border shadow-sm p-5 ${!c.active ? 'opacity-60 border-gray-100' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-gray-800">{c.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.active ? 'Active' : 'Closed'}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{c.description}</p>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>₱{c.current.toLocaleString()} raised</span>
                  <span>Goal: ₱{c.target.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#1B3A6B,#2B5BA8)' }} />
                </div>
                <p className="text-xs font-semibold text-gray-600">{pct.toFixed(0)}% funded · {c.department === 'All' ? 'All Alumni' : c.department}</p>
                {c.deadline && <p className="text-xs text-gray-400 mt-1">Deadline: {c.deadline}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Proof viewer */}
      {viewProof && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewProof(null)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewProof(null)} className="absolute -top-10 right-0 text-white"><X className="w-6 h-6" /></button>
            <img src={viewProof} alt="Proof" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-800">Reject Donation</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Reason (optional)..."
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none resize-none" />
            <div className="flex gap-3">
              <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">Cancel</button>
              <button onClick={handleReject} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* New campaign form */}
      {showCampaignForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-gray-800">New Campaign</h3>
              <button onClick={() => setShowCampaignForm(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Campaign Name', key: 'name', placeholder: 'e.g. Scholarship Fund 2026' },
                { label: 'Description', key: 'description', placeholder: 'Brief description' },
                { label: 'Fundraising Target (₱)', key: 'target', placeholder: 'e.g. 200000' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">{f.label}</label>
                  <input value={(campaignForm as any)[f.key]} onChange={e => setCampaignForm(p => ({...p, [f.key]: e.target.value}))}
                    placeholder={f.placeholder} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-400" />
                </div>
              ))}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Department</label>
                  <select value={campaignForm.department} onChange={e => setCampaignForm(p => ({...p, department: e.target.value}))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-400">
                    {['All','CSE','CTHM','BAA','CED','CN'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Deadline</label>
                  <input type="date" value={campaignForm.deadline} onChange={e => setCampaignForm(p => ({...p, deadline: e.target.value}))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-400" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowCampaignForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddCampaign} disabled={!campaignForm.name || !campaignForm.target}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#1B3A6B,#2B5BA8)' }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
