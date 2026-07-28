import React, { useState, useEffect } from 'react';
import { Button, Card, CardContent, LinearProgress, Chip, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { FileText, Send, Eye, BarChart3, Download, Search } from 'lucide-react';
import { api } from '../../lib/api';

interface Survey {
  id: string;
  title: string;
  description: string;
  targetDept: string;
  targetYear: string;
  totalSent: number;
  totalResponses: number;
  status: 'Draft' | 'Active' | 'Closed';
  createdDate: string;
}

export default function TracerSurveys() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadSurveys = () => {
    api.get('/surveys').then((res) => setSurveys(res.surveys));
  };

  useEffect(() => { loadSurveys(); }, []);

  const filteredSurveys = surveys.filter(survey =>
    survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    survey.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    survey.targetDept.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = surveys.filter(s => s.status === 'Active').length;
  const totalSent = surveys.reduce((sum, s) => sum + s.totalSent, 0);
  const totalResponses = surveys.reduce((sum, s) => sum + s.totalResponses, 0);
  const avgResponseRate = totalSent > 0 ? ((totalResponses / totalSent) * 100).toFixed(1) : '0.0';

  const handleCreate = async () => {
    const title = window.prompt('Survey title:');
    if (!title) return;
    const targetDept = window.prompt('Target department (or "All"):', 'All') || 'All';
    await api.post('/surveys', {
      title, description: '', targetDept, targetYear: 'All',
      questions: [], status: 'Draft',
    });
    loadSurveys();
  };

  const handleDeploy = async (survey: Survey) => {
    if (!confirm(`Activate "${survey.title}" so alumni can respond?`)) return;
    await api.put(`/surveys/${survey.id}`, { status: 'Active' });
    loadSurveys();
  };

  const [viewingSurvey, setViewingSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<any[]>([]);

  const handleViewResponses = async (survey: Survey) => {
    setViewingSurvey(survey);
    const res = await api.get(`/surveys/${survey.id}/responses`);
    setResponses(res.responses);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl mb-1">Tracer Surveys</h2>
          <p className="text-gray-600">Deploy and monitor alumni tracer surveys</p>
        </div>
        <Button
          variant="contained"
          startIcon={<FileText className="w-4 h-4" />}
          className="bg-blue-600"
          onClick={handleCreate}
        >
          Create New Survey
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search surveys by title, description, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search className="w-4 h-4 text-gray-400 mr-2" />
            }}
          />
        </CardContent>
      </Card>

      {/* Survey Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Surveys</span>
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl">{surveys.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Active Surveys</span>
              <Send className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg Response Rate</span>
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl">{avgResponseRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Survey List */}
      <div className="space-y-4">
        {filteredSurveys.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No surveys found matching your search</p>
            </CardContent>
          </Card>
        ) : (
          filteredSurveys.map((survey) => {
          const responseRate = survey.totalSent > 0 ? (survey.totalResponses / survey.totalSent) * 100 : 0;
          return (
            <Card key={survey.id}>
              <CardContent>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg">{survey.title}</h3>
                      <Chip
                        label={survey.status}
                        size="small"
                        color={
                          survey.status === 'Active' ? 'success' :
                          survey.status === 'Draft' ? 'default' : 'error'
                        }
                      />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{survey.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Target: {survey.targetDept} • {survey.targetYear}</span>
                      <span>Created: {new Date(survey.createdDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Eye className="w-4 h-4" />}
                      onClick={() => handleViewResponses(survey)}
                    >
                      View ({survey.totalResponses})
                    </Button>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Response Rate</span>
                    <span>{survey.totalResponses} / {survey.totalSent} ({responseRate.toFixed(1)}%)</span>
                  </div>
                  <LinearProgress
                    variant="determinate"
                    value={responseRate}
                    className="h-2 rounded"
                  />
                </div>

                {/* Quick Stats */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-600">{survey.totalResponses} response{survey.totalResponses === 1 ? '' : 's'} recorded</p>
                  {survey.status === 'Draft' && (
                    <Button size="small" variant="contained" className="bg-green-600" onClick={() => handleDeploy(survey)}>
                      Activate Survey
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
          })
        )}
      </div>

      {/* Survey Template Preview */}
      <Card>
        <CardContent>
          <h3 className="text-lg mb-4">Quick Deploy Template</h3>
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <p className="text-sm">Standard Employment Tracer Questions:</p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Current employment status</li>
              <li>• Company name and position (if employed)</li>
              <li>• Job alignment with degree program</li>
              <li>• Monthly income range</li>
              <li>• Skills utilized in current work</li>
              <li>• Recommendations for curriculum improvement</li>
            </ul>
            <Button variant="contained" size="small" className="bg-blue-600" onClick={async () => {
              await api.post('/surveys', {
                title: 'Standard Employment Tracer Survey',
                description: 'Standard employment tracer questions deployed to all alumni.',
                targetDept: 'All', targetYear: 'All', status: 'Active',
                questions: [
                  { id: 'q1', question: 'Current employment status', type: 'select', options: ['Employed', 'Unemployed', 'Self-Employed', 'Pursuing Studies'] },
                  { id: 'q2', question: 'Company name and position (if employed)', type: 'text' },
                  { id: 'q3', question: 'Job alignment with degree program', type: 'select', options: ['Highly Relevant', 'Somewhat Relevant', 'Not Relevant'] },
                  { id: 'q4', question: 'Recommendations for curriculum improvement', type: 'text' },
                ],
              });
              loadSurveys();
            }}>
              Deploy to All Alumni
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewingSurvey} onClose={() => setViewingSurvey(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{viewingSurvey?.title} — Responses</DialogTitle>
        <DialogContent>
          {responses.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No responses yet.</p>
          ) : (
            <div className="space-y-3 pt-2">
              {responses.map((r) => (
                <div key={r.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">{r.employmentStatus || 'Not specified'}</span>
                    <span className="text-xs text-gray-400">{new Date(r.submittedAt).toLocaleDateString()}</span>
                  </div>
                  {r.currentCompany && <p className="text-xs text-gray-600">{r.position ? `${r.position} at ` : ''}{r.currentCompany}</p>}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingSurvey(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
