import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useDarkMode } from './DarkModeContext';
import { Sun, Moon, Camera, Mail, Phone, MapPin, Calendar, GraduationCap, Building, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const { dark, toggle } = useDarkMode();
  const [profileImage, setProfileImage] = useState(
    user?.profileImage ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=1B3A6B&color=fff&bold=true`
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const card = dark
    ? 'bg-gray-800 border border-gray-700 rounded-xl p-5'
    : 'bg-white border border-gray-100 rounded-xl p-5 shadow-sm';

  const label = dark ? 'text-gray-400 text-xs' : 'text-gray-500 text-xs';
  const value = dark ? 'text-white text-sm font-medium' : 'text-gray-800 text-sm font-medium';
  const heading = dark ? 'text-white font-bold text-base mb-4' : 'text-gray-800 font-bold text-base mb-4';

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
        <div>
          <h2 className={dark ? 'text-2xl font-bold text-white' : 'text-2xl font-bold text-gray-800'}>
            My Profile
          </h2>
          <p className={dark ? 'text-gray-400 text-sm' : 'text-gray-500 text-sm'}>
            Manage your account information and preferences
          </p>
        </div>
      </div>

      {/* Profile card */}
      <div className={card}>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <img
              src={profileImage}
              alt={user?.name}
              className="w-24 h-24 rounded-full object-cover border-4"
              style={{ borderColor: dark ? '#374151' : '#e5e7eb' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=1B3A6B&color=fff&bold=true`;
              }}
            />
            <label
              htmlFor="profile-upload"
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
              style={{ background: 'linear-gradient(135deg, #1B3A6B, #2B5BA8)' }}
            >
              <Camera className="w-3.5 h-3.5 text-white" />
              <input id="profile-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
          <div>
            <h3 className={dark ? 'text-xl font-bold text-white' : 'text-xl font-bold text-gray-800'}>{user?.name}</h3>
            <p className={dark ? 'text-gray-400 text-sm' : 'text-gray-500 text-sm'}>{user?.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {user?.department && (
                <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: '#2B5BA8' }}>
                  {user.department}
                </span>
              )}
              {user?.batchYear && (
                <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: '#1B3A6B' }}>
                  Batch {user.batchYear}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 capitalize font-medium">
                ✓ {user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings card — dark/light mode */}
      <div className={card}>
        <h3 className={heading}>Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className={value}>Theme Mode</p>
            <p className={label}>Switch between light and dark interface</p>
          </div>
          <button
            onClick={toggle}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border"
            style={
              dark
                ? { background: '#1f2937', borderColor: '#374151', color: '#f9fafb' }
                : { background: '#f9fafb', borderColor: '#e5e7eb', color: '#1f2937' }
            }
          >
            {dark ? (
              <><Sun className="w-4 h-4 text-yellow-400" /> Light Mode</>
            ) : (
              <><Moon className="w-4 h-4 text-indigo-500" /> Dark Mode</>
            )}
          </button>
        </div>
      </div>

      {/* Personal info */}
      <div className={card}>
        <h3 className={heading}>Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: <Mail className="w-4 h-4" />, label: 'Email Address', val: user?.email },
            { icon: <Phone className="w-4 h-4" />, label: 'Phone Number', val: '+63 912 345 6789' },
            { icon: <MapPin className="w-4 h-4" />, label: 'Address', val: '123 Main Street, Manila' },
            { icon: <GraduationCap className="w-4 h-4" />, label: 'Department', val: user?.department || '—' },
            { icon: <Calendar className="w-4 h-4" />, label: 'Batch Year', val: user?.batchYear?.toString() || '—' },
            { icon: <Building className="w-4 h-4" />, label: 'Employment', val: 'Software Developer at Tech Corp' },
          ].map((f, i) => (
            <div key={i} className={`p-3 rounded-lg ${dark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={dark ? 'text-gray-400' : 'text-gray-400'}>{f.icon}</span>
                <span className={label}>{f.label}</span>
              </div>
              <p className={value}>{f.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy notice */}
      <div className={`${card} ${dark ? 'border-blue-800 bg-blue-900/20' : 'border-blue-200 bg-blue-50'}`}>
        <div className="flex items-start gap-3">
          <Shield className={`w-5 h-5 mt-0.5 flex-shrink-0 ${dark ? 'text-blue-400' : 'text-blue-600'}`} />
          <div>
            <p className={`text-sm font-semibold mb-1 ${dark ? 'text-blue-300' : 'text-blue-700'}`}>Privacy & Data Protection</p>
            <p className={`text-xs ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
              Your personal information is protected under RA 10173 (Data Privacy Act of 2012).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
