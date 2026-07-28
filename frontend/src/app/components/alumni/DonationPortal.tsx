import React, { useState, useEffect } from 'react';
import { DollarSign, Upload, CheckCircle, Clock, Heart, TrendingUp, X, AlertCircle, Image, Copy, Receipt, Check } from 'lucide-react';
import { useDonations } from '../shared/DonationContext';
import { useAuth } from '../AuthContext';
import { api, ApiError } from '../../lib/api';

const statusConfig = {
  Pending:  { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending Verification' },
  Verified: { color: 'bg-green-100 text-green-700 border-green-200',  icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Verified' },
  Rejected: { color: 'bg-red-100 text-red-700 border-red-200',        icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Rejected' },
};

const DEFAULT_PAYMENT_INFO = {
  gcashNumber: '09XX XXX XXXX', gcashName: 'Asian College Alumni',
  bankName: 'BDO Unibank', accountName: 'Asian College Foundation Inc.',
  accountNumber: '1234-5678-90',
  instructions: 'After transferring, upload your receipt/screenshot below. Your donation will be verified within 1–3 business days.',
};

// Turns a raw donation id like "don_mry6t0..." into a friendlier reference
// number for display/printing, e.g. "DON-MRY6T0".
function referenceNumber(id: string) {
  return id.replace(/^don_/, 'DON-').toUpperCase();
}

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="flex items-center justify-between gap-2 bg-white/60 rounded-lg px-2.5 py-1.5">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-blue-500 font-semibold">{label}</p>
        <p className="text-sm text-blue-900 font-mono truncate">{value}</p>
      </div>
      <button onClick={handleCopy} className="flex-shrink-0 p-1.5 rounded-md hover:bg-blue-100 transition-colors" title="Copy">
        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-blue-500" />}
      </button>
    </div>
  );
}

export default function DonationPortal() {
  const { user } = useAuth();
  const { donations, campaigns, submitDonation } = useDonations();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'Cash', campaign: '', amount: '', description: '' });
  const [proof, setProof] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState('');
  const [submitted, setSubmitted] = useState<{ id: string; campaign: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [paymentInfo, setPaymentInfo] = useState(DEFAULT_PAYMENT_INFO);
  const [receiptFor, setReceiptFor] = useState<any>(null);

  useEffect(() => {
    api.get('/donation-info').then((res) => setPaymentInfo({ ...DEFAULT_PAYMENT_INFO, ...res.donation })).catch(() => {});
  }, []);

  const myDonations = donations.filter(d => d.alumniEmail === user?.email || d.alumniName === user?.name);
  const totalVerified = myDonations.filter(d => d.status === 'Verified').reduce((s, d) => s + d.amount, 0);
  const pendingCount = myDonations.filter(d => d.status === 'Pending').length;

  const handleProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setProof(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setShowForm(false);
    setForm({ type: 'Cash', campaign: '', amount: '', description: '' });
    setProof(null); setProofFileName('');
    setFormError('');
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!form.campaign) { setFormError('Please select a campaign.'); return; }
    if (form.type === 'Cash' && !form.amount) { setFormError('Please enter an amount.'); return; }
    if (form.type === 'Cash' && Number(form.amount) <= 0) { setFormError('Amount must be greater than ₱0.'); return; }
    if (form.type === 'Cash' && !proof) { setFormError('Please upload your proof of payment.'); return; }
    if (form.type === 'In-Kind' && !form.description.trim()) { setFormError('Please describe what you\'re donating.'); return; }

    setSubmitting(true);
    try {
      const created = await submitDonation({
        alumniName: user?.name || 'Alumni',
        alumniEmail: user?.email || '',
        department: user?.department || 'All',
        campaign: form.campaign || 'General Fund',
        amount: form.type === 'Cash' ? Number(form.amount) : 0,
        type: form.type as 'Cash' | 'In-Kind',
        description: form.description,
        proofUrl: proof,
      });
      resetForm();
      setSubmitted({ id: created?.id || '', campaign: form.campaign });
      setTimeout(() => setSubmitted(null), 8000);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong submitting your donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Donations</h2>
          <p className="text-sm text-gray-500">Support your alma mater through contributions</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#1B3A6B,#2B5BA8)' }}>
          <Heart className="w-4 h-4" /> Make a Donation
        </button>
      </div>

      {/* Submission success toast */}
      {submitted && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-green-800">Donation Submitted!</p>
            <p className="text-xs text-green-600">
              Your contribution to <strong>{submitted.campaign}</strong> is under review.
              {submitted.id && <> Reference: <span className="font-mono font-semibold">{referenceNumber(submitted.id)}</span> — keep this for your records.</>}
              {' '}You'll be notified once it's verified.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Donated', value: `₱${totalVerified.toLocaleString()}`, sub: 'Verified contributions', icon: <DollarSign className="w-5 h-5" />, color: '#059669' },
          { label: 'Transactions', value: myDonations.length, sub: 'All time', icon: <TrendingUp className="w-5 h-5" />, color: '#2B5BA8' },
          { label: 'Pending', value: pendingCount, sub: 'Awaiting verification', icon: <Clock className="w-5 h-5" />, color: '#d97706' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" style={{ borderLeftWidth: 3, borderLeftColor: s.color }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{s.label}</span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Active campaigns */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">Active Campaigns</h3>
        {campaigns.filter(c => c.active).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3"><Heart className="w-7 h-7 text-gray-300" /></div>
            <p className="font-semibold text-gray-500 mb-1">No Active Campaigns</p>
            <p className="text-sm text-gray-400">Check back later for fundraising campaigns.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.filter(c => c.active).map(c => {
              const pct = Math.min((c.current / c.target) * 100, 100);
              return (
                <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-bold text-gray-800">{c.name}</h4>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{c.department === 'All' ? 'All' : c.department}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{c.description}</p>
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>₱{c.current.toLocaleString()} raised</span>
                    <span>Goal: ₱{c.target.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#1B3A6B,#2B5BA8)' }} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-600">{pct.toFixed(0)}% funded</span>
                    {c.deadline && <span className="text-xs text-gray-400">Ends {c.deadline}</span>}
                  </div>
                  <button onClick={() => { setForm(f => ({...f, campaign: c.name})); setShowForm(true); }}
                    className="w-full mt-3 py-2 rounded-xl text-sm font-bold border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors">
                    Donate to this campaign
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My history */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">My Donation History</h3>
        {myDonations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3"><TrendingUp className="w-7 h-7 text-gray-300" /></div>
            <p className="font-semibold text-gray-500 mb-1">No Donations Yet</p>
            <p className="text-sm text-gray-400">Make your first donation to support your alma mater.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myDonations.map(d => {
              const cfg = statusConfig[d.status];
              return (
                <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-gray-800">{d.campaign}</p>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {d.type === 'Cash' ? `₱${d.amount.toLocaleString()}` : `In-Kind: ${d.description}`}
                        {' · '}{new Date(d.submittedAt).toLocaleDateString()}
                        {' · '}<span className="font-mono text-xs text-gray-400">{referenceNumber(d.id)}</span>
                      </p>
                      {d.status === 'Rejected' && d.rejectionReason && (
                        <p className="text-xs text-red-600 mt-1">Reason: {d.rejectionReason}</p>
                      )}
                      {d.status === 'Pending' && (
                        <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Your proof of payment is being reviewed by the admin.
                        </p>
                      )}
                      {d.status === 'Verified' && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Verified by {d.verifiedBy} on {d.verifiedAt ? new Date(d.verifiedAt).toLocaleDateString() : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {d.proofUrl && (
                        <img src={d.proofUrl} alt="proof" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                      )}
                      {d.status === 'Verified' && (
                        <button onClick={() => setReceiptFor(d)} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                          <Receipt className="w-3.5 h-3.5" /> Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Donation form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-gray-800">Make a Donation</h3>
              <button onClick={resetForm}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{formError}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Donation Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {['Cash', 'In-Kind'].map(t => (
                    <button key={t} onClick={() => setForm(f => ({...f, type: t}))}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${form.type === t ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {t === 'Cash' ? '💳 Cash / Transfer' : '📦 In-Kind'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Campaign</label>
                <select value={form.campaign} onChange={e => setForm(f => ({...f, campaign: e.target.value}))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-400">
                  <option value="">Select a campaign</option>
                  {campaigns.filter(c => c.active).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  <option value="General Fund">General Fund</option>
                </select>
              </div>

              {form.type === 'Cash' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount (₱)</label>
                    <input type="number" min="1" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                      placeholder="e.g. 1000" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-400" />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-800 mb-2">Payment Instructions</p>
                    <p className="text-[11px] text-blue-600 mb-2">Transfer manually via GCash using the details below, then upload proof — payments are not processed automatically through this portal.</p>
                    <div className="space-y-1.5">
                      <CopyableField label={`GCash — ${paymentInfo.gcashName}`} value={paymentInfo.gcashNumber} />
                      {/* Bank transfer is configured in Admin → System Settings and stored in
                          paymentInfo.bankName / accountName / accountNumber, but is hidden from
                          this demo on purpose — enable it for the final release by un-commenting
                          the line below. */}
                      {/* <CopyableField label={`${paymentInfo.bankName} — ${paymentInfo.accountName}`} value={paymentInfo.accountNumber} /> */}
                    </div>
                    <p className="text-xs text-orange-600 font-semibold mt-3">⚠️ {paymentInfo.instructions}</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Proof of Payment <span className="text-red-500">*</span></label>
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-5 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                      {proof ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <Image className="w-5 h-5" />
                          <span className="text-sm font-semibold">{proofFileName}</span>
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      ) : (
                        <>
                          <Upload className="w-7 h-7 text-gray-400" />
                          <span className="text-sm text-gray-500">Click to upload receipt/screenshot</span>
                          <span className="text-xs text-gray-400">JPG, PNG supported</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleProof} />
                    </label>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Description of Donation</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3}
                    placeholder="e.g. 10 Computer Science textbooks, 5 desktop computers..." className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-400 resize-none" />
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={resetForm} disabled={submitting} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#1B3A6B,#2B5BA8)' }}>
                {submitting ? 'Submitting…' : 'Submit Donation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {receiptFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5 text-white" style={{ background: 'linear-gradient(135deg,#1B3A6B,#2B5BA8)' }}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2"><Receipt className="w-5 h-5" /> Donation Receipt</h3>
                <button onClick={() => setReceiptFor(null)}><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-blue-100 mt-1">Asian College Alumni Association</p>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Reference No.</span><span className="font-mono font-semibold">{referenceNumber(receiptFor.id)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Donor</span><span className="font-semibold">{receiptFor.alumniName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Campaign</span><span className="font-semibold">{receiptFor.campaign}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-semibold">{receiptFor.type}</span></div>
              {receiptFor.type === 'Cash' ? (
                <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-bold text-green-700">₱{receiptFor.amount.toLocaleString()}</span></div>
              ) : (
                <div className="flex justify-between"><span className="text-gray-500">Item(s)</span><span className="font-semibold text-right">{receiptFor.description}</span></div>
              )}
              <div className="flex justify-between"><span className="text-gray-500">Submitted</span><span>{new Date(receiptFor.submittedAt).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Verified By</span><span>{receiptFor.verifiedBy}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Verified On</span><span>{receiptFor.verifiedAt ? new Date(receiptFor.verifiedAt).toLocaleDateString() : '—'}</span></div>
              <div className="pt-3 border-t flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs font-semibold">Verified contribution — thank you for supporting Asian College!</span>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => window.print()} className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
