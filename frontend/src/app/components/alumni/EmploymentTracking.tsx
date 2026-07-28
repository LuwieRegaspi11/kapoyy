import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button, TextField, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import { Briefcase, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { api } from '../../lib/api';

export default function EmploymentTracking() {
  const { user } = useAuth();
  const [employmentStatus, setEmploymentStatus] = useState(user?.employmentStatus || 'Employed');
  const [company, setCompany] = useState((user as any)?.currentCompany || '');
  const [position, setPosition] = useState((user as any)?.position || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSurveys, setActiveSurveys] = useState<any[]>([]);

  useEffect(() => {
    api.get('/surveys').then((res) => setActiveSurveys(res.surveys.filter((s: any) => s.status === 'Active')));
  }, []);

  const currentEmployment = {
    status: user?.employmentStatus || 'Not specified',
    company: (user as any)?.currentCompany || 'Not specified',
    position: (user as any)?.position || 'Not specified',
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await api.put('/alumni/me', { employmentStatus, currentCompany: company, position });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl mb-1">Employment Status Tracking</h2>
          <p className="text-gray-600">Keep your employment information up-to-date</p>
        </div>
      </div>

      {/* Current Status Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-lg">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg mb-1">Current Employment Status</h3>
                <p className="text-2xl">{currentEmployment.status}</p>
              </div>
            </div>
            {saved && (
              <Chip label="Updated" color="success" icon={<CheckCircle className="w-4 h-4" />} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employment Details */}
      <Card>
        <CardContent>
          <h3 className="text-lg mb-4">Current Employment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Company</p>
              <p>{currentEmployment.company}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Position</p>
              <p>{currentEmployment.position}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update Employment Form */}
      <Card>
        <CardContent>
          <h3 className="text-lg mb-4">Update Employment Information</h3>
          <div className="space-y-4">
            <FormControl fullWidth>
              <InputLabel>Employment Status</InputLabel>
              <Select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                label="Employment Status"
              >
                <MenuItem value="Employed">Employed</MenuItem>
                <MenuItem value="Self-Employed">Self-Employed</MenuItem>
                <MenuItem value="Unemployed">Unemployed</MenuItem>
                <MenuItem value="Pursuing Studies">Pursuing Further Studies</MenuItem>
              </Select>
            </FormControl>

            {(employmentStatus === 'Employed' || employmentStatus === 'Self-Employed') && (
              <>
                <TextField fullWidth label="Company Name" value={company} onChange={(e) => setCompany(e.target.value)} />
                <TextField fullWidth label="Position/Job Title" value={position} onChange={(e) => setPosition(e.target.value)} />
              </>
            )}

            <div className="flex gap-3">
              <Button variant="contained" className="bg-blue-600" startIcon={<TrendingUp className="w-4 h-4" />} onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saving…' : 'Update Employment Status'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Surveys */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg mb-1">Open Tracer Surveys</h3>
              <p className="text-sm text-gray-600">Complete these surveys to help improve our programs</p>
            </div>
            <Chip label={`${activeSurveys.length} Open`} color={activeSurveys.length > 0 ? 'warning' : 'default'} />
          </div>
          <div className="space-y-3">
            {activeSurveys.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No open surveys right now — check back later.</p>
            )}
            {activeSurveys.map((s) => (
              <div key={s.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm">{s.title}</p>
                    <p className="text-xs text-gray-600">{s.description}</p>
                  </div>
                </div>
                <Button variant="outlined" size="small" href="/alumni/tracer-survey">Complete Survey</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
