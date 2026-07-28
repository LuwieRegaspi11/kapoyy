import React, { useState, useEffect } from 'react';
import {
  Globe, CreditCard, Mail, Building2, Save, Upload,
  CheckCircle, Phone, AtSign, Link, Calendar, Palette, Sun, Moon
} from 'lucide-react';
import { useDarkMode } from '../shared/DarkModeContext';
import { api } from '../../lib/api';

type Tab = 'university' | 'donation' | 'emails' | 'appearance';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'university',  label: 'University Info',   icon: <Building2 className="w-4 h-4" /> },
  { id: 'donation',    label: 'Payment Config',     icon: <CreditCard className="w-4 h-4" /> },
  { id: 'emails',      label: 'Email Templates',    icon: <Mail className="w-4 h-4" /> },
  { id: 'appearance',  label: 'Appearance',         icon: <Palette className="w-4 h-4" /> },
];

const DEFAULT_UNI = {
  name: 'Asian College', tagline: 'Excellence in Education',
  address: 'Flores St., Dumaguete City, Negros Oriental, Philippines',
  phone: '+63 35 225 4411', email: 'info@asiancollege.edu.ph',
  website: 'www.asiancollege.edu.ph', foundedYear: '1989',
};

const DEFAULT_DONATION = {
  gcashNumber: '09XX XXX XXXX', gcashName: 'Asian College Alumni',
  bankName: 'BDO Unibank', accountName: 'Asian College Foundation Inc.',
  accountNumber: '1234-5678-90',
  instructions: 'After transferring, upload your receipt/screenshot in the Donation Center. Your donation will be verified within 1–3 business days.',
};

const DEFAULT_TEMPLATES = {
  welcomeSubject: 'Welcome to Asian College Alumni Portal!',
  welcomeBody: 'Dear {name},\n\nYour account has been approved. You can now log in and access the alumni portal at alumni.asiancollege.edu.ph.\n\nBest regards,\nAsian College Alumni Office',
  eventSubject: 'Upcoming Event: {eventName}',
  eventBody: 'Dear {name},\n\nWe would like to invite you to {eventName} on {date} at {venue}.\n\nPlease register before {deadline}.\n\nBest regards,\nAsian College Alumni Office',
  surveySubject: 'Tracer Survey Reminder',
  surveyBody: 'Dear {name},\n\nThis is a reminder to complete the tracer survey. Your response is important for improving our programs.\n\nDeadline: {deadline}\n\nBest regards,\nAsian College Alumni Office',
  donationSubject: 'Donation Verified — Thank You!',
  donationBody: 'Dear {name},\n\nThank you for your generous contribution of {amount} to {campaign}. Your donation has been successfully verified.\n\nBest regards,\nAsian College Alumni Office',
};

export default function SystemSettings() {
  const { dark, toggle } = useDarkMode();
  const [activeTab, setActiveTab] = useState<Tab>('university');
  const [saved, setSaved] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);

  const [uni, setUni] = useState(DEFAULT_UNI);
  const [donation, setDonation] = useState(DEFAULT_DONATION);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);

  useEffect(() => {
    api.get('/settings').then((res) => {
      const s = res.settings || {};
      if (s.university) setUni({ ...DEFAULT_UNI, ...s.university });
      if (s.donation) setDonation({ ...DEFAULT_DONATION, ...s.donation });
      if (s.templates) setTemplates({ ...DEFAULT_TEMPLATES, ...s.templates });
      if (s.logo) setLogo(s.logo);
    });
  }, []);

  const handleSave = async () => {
    await api.put('/settings', { university: uni, donation, templates, logo });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const card = `rounded-2xl border p-6 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`;
  const fieldBg = dark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400';
  const labelCls = `text-xs font-semibold mb-1.5 block ${dark ? 'text-gray-400' : 'text-gray-500'}`;

  const Field = ({ label, value, onChange, type = 'text', icon, rows }: {
    label: string; value: string; onChange: (v: string) => void;
    type?: string; icon?: React.ReactNode; rows?: number;
  }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        {rows ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
            className={`w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-400 resize-none transition-colors ${fieldBg}`} />
        ) : (
          <input type={type} value={value} onChange={e => onChange(e.target.value)}
            className={`w-full text-sm border rounded-xl py-2.5 focus:outline-none focus:border-blue-400 transition-colors ${fieldBg} ${icon ? 'pl-9 pr-4' : 'px-3'}`} />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 w-full">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
        <div>
          <h2 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>System Settings</h2>
          <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Configure university information and system preferences</p>
        </div>
        <button onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${saved ? 'bg-green-500' : ''}`}
          style={!saved ? { background: 'linear-gradient(135deg,#1B3A6B,#2B5BA8)' } : {}}>
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>

      {/* Tab bar */}
      <div className={`flex gap-1 p-1 rounded-2xl w-full ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === t.id
                ? 'bg-white text-gray-800 shadow-sm'
                : dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === t.id && dark ? { backgroundColor: '#1e293b', color: '#f1f5f9' } : {}}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── University Info ── */}
      {activeTab === 'university' && (
        <div className="space-y-5">
          {/* Logo + Name row */}
          <div className={card}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-800'}`}>
              <Globe className="w-4 h-4 text-blue-500" /> University Information
            </h3>
            <div className="flex items-start gap-6 mb-6">
              <div className="flex flex-col items-center gap-3">
                <div className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden ${dark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'}`}>
                  {logo ? <img src={logo} alt="logo" className="w-full h-full object-contain p-2" /> :
                    <div className="text-center px-2">
                      <Building2 className={`w-8 h-8 mx-auto mb-1 ${dark ? 'text-gray-500' : 'text-gray-300'}`} />
                      <span className={`text-[10px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>University Logo</span>
                    </div>
                  }
                </div>
                <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${dark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <Upload className="w-3 h-3" /> Upload Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="University Name" value={uni.name} onChange={v => setUni(u => ({...u, name: v}))} icon={<Building2 className="w-3.5 h-3.5" />} />
                <Field label="Tagline" value={uni.tagline} onChange={v => setUni(u => ({...u, tagline: v}))} />
                <Field label="Founded Year" value={uni.foundedYear} onChange={v => setUni(u => ({...u, foundedYear: v}))} icon={<Calendar className="w-3.5 h-3.5" />} />
                <Field label="Website" value={uni.website} onChange={v => setUni(u => ({...u, website: v}))} icon={<Link className="w-3.5 h-3.5" />} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Address" value={uni.address} onChange={v => setUni(u => ({...u, address: v}))} />
              </div>
              <Field label="Phone" value={uni.phone} onChange={v => setUni(u => ({...u, phone: v}))} icon={<Phone className="w-3.5 h-3.5" />} />
              <Field label="Email" value={uni.email} onChange={v => setUni(u => ({...u, email: v}))} icon={<AtSign className="w-3.5 h-3.5" />} />
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Config ── */}
      {activeTab === 'donation' && (
        <div className="space-y-5">
          <div className={card}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-800'}`}>
              <CreditCard className="w-4 h-4 text-green-500" /> GCash Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="GCash Number" value={donation.gcashNumber} onChange={v => setDonation(d => ({...d, gcashNumber: v}))} icon={<Phone className="w-3.5 h-3.5" />} />
              <Field label="GCash Account Name" value={donation.gcashName} onChange={v => setDonation(d => ({...d, gcashName: v}))} />
            </div>
          </div>

          <div className={card}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-800'}`}>
              <CreditCard className="w-4 h-4 text-blue-500" /> Bank Transfer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Bank Name" value={donation.bankName} onChange={v => setDonation(d => ({...d, bankName: v}))} />
              <Field label="Account Name" value={donation.accountName} onChange={v => setDonation(d => ({...d, accountName: v}))} />
              <Field label="Account Number" value={donation.accountNumber} onChange={v => setDonation(d => ({...d, accountNumber: v}))} />
            </div>
          </div>

          <div className={card}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-800'}`}>
              <Mail className="w-4 h-4 text-purple-500" /> Payment Instructions
            </h3>
            <Field label="Shown to alumni when donating" value={donation.instructions} onChange={v => setDonation(d => ({...d, instructions: v}))} rows={4} />
          </div>
        </div>
      )}

      {/* ── Email Templates ── */}
      {activeTab === 'emails' && (
        <div className="space-y-5">
          <div className={`${dark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-2xl p-4`}>
            <p className={`text-xs font-semibold mb-1 ${dark ? 'text-blue-300' : 'text-blue-700'}`}>Available Placeholders</p>
            <div className="flex flex-wrap gap-2">
              {['{name}','{email}','{eventName}','{date}','{venue}','{deadline}','{amount}','{campaign}'].map(p => (
                <code key={p} className={`text-xs px-2 py-0.5 rounded-lg font-mono ${dark ? 'bg-gray-700 text-blue-300' : 'bg-white text-blue-700 border border-blue-200'}`}>{p}</code>
              ))}
            </div>
          </div>

          {[
            { title: 'Welcome Email', icon: '👋', subj: 'welcomeSubject', body: 'welcomeBody', color: 'text-green-500' },
            { title: 'Event Notification', icon: '📅', subj: 'eventSubject', body: 'eventBody', color: 'text-blue-500' },
            { title: 'Survey Reminder', icon: '📋', subj: 'surveySubject', body: 'surveyBody', color: 'text-purple-500' },
            { title: 'Donation Confirmed', icon: '💙', subj: 'donationSubject', body: 'donationBody', color: 'text-orange-500' },
          ].map(t => (
            <div key={t.title} className={card}>
              <h3 className={`font-bold mb-4 flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-800'}`}>
                <span>{t.icon}</span> {t.title}
              </h3>
              <div className="space-y-3">
                <Field label="Subject Line" value={(templates as any)[t.subj]} onChange={v => setTemplates(e => ({...e, [t.subj]: v}))} />
                <Field label="Body" value={(templates as any)[t.body]} onChange={v => setTemplates(e => ({...e, [t.body]: v}))} rows={5} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Appearance ── */}
      {activeTab === 'appearance' && (
        <div className="space-y-5">
          <div className={card}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-800'}`}>
              <Palette className="w-4 h-4 text-purple-500" /> Theme & Display
            </h3>
            <div className="space-y-4">
              {/* Dark/Light toggle */}
              <div className={`flex items-center justify-between p-4 rounded-xl border ${dark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div>
                  <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>Interface Theme</p>
                  <p className={`text-xs mt-0.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Toggle between light and dark mode across all pages</p>
                </div>
                <button onClick={toggle}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                    dark
                      ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-300 hover:bg-yellow-400/20'
                      : 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
                  }`}>
                  {dark ? <><Sun className="w-4 h-4" /> Light Mode</> : <><Moon className="w-4 h-4" /> Dark Mode</>}
                </button>
              </div>

              {/* Color preview */}
              <div className={`p-4 rounded-xl border ${dark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-sm font-bold mb-3 ${dark ? 'text-white' : 'text-gray-800'}`}>Brand Color Palette</p>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { name: 'Navy', hex: '#1B3A6B' },
                    { name: 'Blue', hex: '#2B5BA8' },
                    { name: 'Light Blue', hex: '#5B9BD5' },
                    { name: 'Red', hex: '#CC2200' },
                  ].map(c => (
                    <div key={c.name} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg shadow-sm" style={{ background: c.hex }} />
                      <div>
                        <p className={`text-xs font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>{c.name}</p>
                        <p className={`text-[10px] font-mono ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{c.hex}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current mode indicator */}
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${dark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? 'bg-gray-600' : 'bg-white border border-gray-200'}`}>
                  {dark ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                </div>
                <div>
                  <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>
                    Currently in {dark ? 'Dark' : 'Light'} Mode
                  </p>
                  <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Preference is saved and applied across all sessions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
