import React from 'react';
import { useAuth } from '../AuthContext';
import { FileText, TrendingUp, Users, CheckCircle } from 'lucide-react';

const mockResponses = [
  { name: 'Maria Santos', program: 'BSIT', batchYear: 2022, employment: 'Employed', industry: 'IT', relatedToProgram: 'Very related', completed: true },
  { name: 'Juan Reyes', program: 'BSCS', batchYear: 2021, employment: 'Self-Employed', industry: 'IT', relatedToProgram: 'Somewhat related', completed: true },
  { name: 'Ana Cruz', program: 'BSIT', batchYear: 2022, employment: 'Employed', industry: 'Government', relatedToProgram: 'Not related', completed: true },
  { name: 'Pedro Lim', program: 'BSCS', batchYear: 2020, employment: 'Unemployed', industry: '—', relatedToProgram: '—', completed: false },
  { name: 'Rosa Garcia', program: 'BSIT', batchYear: 2021, employment: 'Pursuing Studies', industry: '—', relatedToProgram: '—', completed: true },
];

const empColors: Record<string, string> = {
  'Employed': 'bg-green-100 text-green-700',
  'Self-Employed': 'bg-blue-100 text-blue-700',
  'Unemployed': 'bg-red-100 text-red-700',
  'Pursuing Studies': 'bg-purple-100 text-purple-700',
};

export default function FacultyTracerView() {
  const { user } = useAuth();
  const completed = mockResponses.filter(r => r.completed).length;
  const employed = mockResponses.filter(r => r.employment === 'Employed' || r.employment === 'Self-Employed').length;
  const rate = ((employed / mockResponses.length) * 100).toFixed(0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Tracer Surveys</h2>
        <p className="text-sm text-gray-500">View survey responses from <strong>{user?.department}</strong> alumni</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
        <span className="text-amber-600">🔒</span>
        <p className="text-xs text-amber-700 font-medium">Faculty can view survey reports for their department only. Creating surveys is an Admin function.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Responses', value: mockResponses.length, color: '#2B5BA8', icon: <FileText className="w-5 h-5" /> },
          { label: 'Completed', value: completed, color: '#059669', icon: <CheckCircle className="w-5 h-5" /> },
          { label: 'Employment Rate', value: `${rate}%`, color: '#7c3aed', icon: <TrendingUp className="w-5 h-5" /> },
          { label: 'Pending Survey', value: mockResponses.length - completed, color: '#d97706', icon: <Users className="w-5 h-5" /> },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" style={{ borderLeftWidth: 3, borderLeftColor: s.color }}>
            <div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-500">{s.label}</span><span style={{ color: s.color }}>{s.icon}</span></div>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Employment distribution */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Employment Distribution</h3>
        {['Employed','Self-Employed','Unemployed','Pursuing Studies'].map(status => {
          const count = mockResponses.filter(r => r.employment === status).length;
          const pct = (count / mockResponses.length) * 100;
          return (
            <div key={status} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{status}</span>
                <span className="text-sm font-semibold text-gray-800">{count} ({pct.toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#1B3A6B,#2B5BA8)' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Responses table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Individual Responses</h3>
        </div>
        {mockResponses.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3"><FileText className="w-7 h-7 text-gray-300" /></div>
            <p className="font-semibold text-gray-500">No Survey Responses Yet</p>
            <p className="text-sm text-gray-400 mt-1">No alumni from {user?.department} have completed the survey.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Name','Program','Batch','Employment','Industry','Related to Program','Survey'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mockResponses.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{r.name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.program}</td>
                    <td className="px-4 py-3 text-gray-600">{r.batchYear}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${empColors[r.employment] || 'bg-gray-100 text-gray-600'}`}>{r.employment}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.industry}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.relatedToProgram}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.completed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {r.completed ? '✓ Done' : 'Pending'}
                      </span>
                    </td>
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
