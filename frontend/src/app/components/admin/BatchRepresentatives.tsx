import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { UserPlus, Search, Users, Shield, CheckCircle, XCircle } from 'lucide-react';
import { api, ApiError } from '../../lib/api';

interface Representative {
  id: string;
  name: string;
  email: string;
  batchYear: number;
  department: string;
  program: string;
  assignedDate: string;
  verificationsCount: number;
  profileImage?: string;
  status: 'Active' | 'Inactive';
}

export default function BatchRepresentatives() {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBatchYear, setSelectedBatchYear] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');

  // Assign-dialog form state
  const [assignEmail, setAssignEmail] = useState('');
  const [assignYear, setAssignYear] = useState<number | ''>('');
  const [assignDept, setAssignDept] = useState('');
  const [assignProg, setAssignProg] = useState('');

  const loadReps = () => {
    api.get('/representatives').then((res) => setRepresentatives(res.representatives));
  };

  useEffect(() => { loadReps(); }, []);

  const filteredReps = representatives.filter(rep => {
    const matchesSearch = rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rep.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !selectedDepartment || rep.department === selectedDepartment;
    const matchesYear = !selectedBatchYear || rep.batchYear.toString() === selectedBatchYear;
    const matchesProgram = !selectedProgram || rep.program === selectedProgram;
    return matchesSearch && matchesDept && matchesYear && matchesProgram;
  });

  const activeReps = representatives.filter(r => r.status === 'Active').length;
  const totalVerifications = representatives.reduce((sum, r) => sum + r.verificationsCount, 0);

  const handleAssign = async () => {
    setAssignError('');
    if (!assignEmail || !assignYear || !assignDept || !assignProg) {
      setAssignError('All fields are required.');
      return;
    }
    try {
      // Find the alumni user by email so we can promote them to representative.
      const { alumni } = await api.get(`/alumni?department=${encodeURIComponent(assignDept)}&batchYear=${assignYear}`);
      const match = alumni.find((a: any) => a.email.toLowerCase() === assignEmail.toLowerCase());
      if (!match) {
        setAssignError('No alumni found with that email in the selected batch/department.');
        return;
      }
      await api.post('/representatives', { userId: match.id, batchYear: assignYear, department: assignDept, program: assignProg });
      setAssignDialogOpen(false);
      setAssignEmail(''); setAssignYear(''); setAssignDept(''); setAssignProg('');
      loadReps();
    } catch (err) {
      setAssignError(err instanceof ApiError ? err.message : 'Failed to assign representative.');
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this representative?')) return;
    await api.delete(`/representatives/${id}`);
    loadReps();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl mb-1 bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent flex items-center gap-2">
            👥 Batch Representatives
          </h2>
          <p className="text-gray-600">Manage batch representatives for decentralized verification</p>
        </div>
        <Button
          variant="contained"
          startIcon={<UserPlus className="w-4 h-4" />}
          onClick={() => setAssignDialogOpen(true)}
          className="bg-gradient-to-r from-teal-600 to-green-600"
        >
          Assign Representative
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 shadow-lg">
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm mb-1 font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">🔒 Representative System</h4>
              <p className="text-xs text-gray-700">
                Batch Representatives can only verify alumni from their assigned <strong>batch year + department + program</strong>. Only ONE representative per batch year + department + program combination (Unique Constraint). All verification actions are audited per RA 10175.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-all border-l-4 border-teal-500 animate-slide-up">
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 font-medium">Active Representatives</span>
              <div className="bg-teal-100 p-2 rounded-lg">
                <UserPlus className="w-5 h-5 text-teal-500" />
              </div>
            </div>
            <p className="text-3xl bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">{activeReps}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-all border-l-4 border-blue-500 animate-slide-up delay-100">
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 font-medium">Total Verifications</span>
              <div className="bg-blue-100 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <p className="text-3xl bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{totalVerifications}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-all border-l-4 border-purple-500 animate-slide-up delay-200">
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 font-medium">Covered Batches</span>
              <div className="bg-purple-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <p className="text-3xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{representatives.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <TextField
              fullWidth
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search className="w-4 h-4 text-gray-400 mr-2" />
              }}
            />
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                label="Department"
              >
                <MenuItem key="all-dept" value="">All Departments</MenuItem>
                <MenuItem key="CSE" value="CSE">CSE</MenuItem>
                <MenuItem key="CTHM" value="CTHM">CTHM</MenuItem>
                <MenuItem key="BAA" value="BAA">BAA</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Program</InputLabel>
              <Select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                label="Program"
              >
                <MenuItem key="all-program" value="">All Programs</MenuItem>
                <MenuItem key="BSIT" value="BSIT">BSIT</MenuItem>
                <MenuItem key="BSCS" value="BSCS">BSCS</MenuItem>
                <MenuItem key="BSCpE" value="BSCpE">BSCpE</MenuItem>
                <MenuItem key="BSHM" value="BSHM">BSHM</MenuItem>
                <MenuItem key="BSTM" value="BSTM">BSTM</MenuItem>
                <MenuItem key="BSA" value="BSA">BSA</MenuItem>
                <MenuItem key="BSBA" value="BSBA">BSBA</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Batch Year</InputLabel>
              <Select
                value={selectedBatchYear}
                onChange={(e) => setSelectedBatchYear(e.target.value)}
                label="Batch Year"
              >
                <MenuItem key="all-year" value="">All Years</MenuItem>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <MenuItem key={year} value={year.toString()}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </CardContent>
      </Card>

      {/* Representatives Table */}
      <TableContainer component={Paper} className="shadow-lg">
        <Table>
          <TableHead>
            <TableRow className="bg-gradient-to-r from-teal-50 to-green-50">
              <TableCell>Representative</TableCell>
              <TableCell>Assignment</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Program</TableCell>
              <TableCell>Assigned Date</TableCell>
              <TableCell>Verifications</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredReps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <p className="text-gray-500">No batch representatives found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredReps.map((rep) => (
                <TableRow key={rep.id} hover>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar src={rep.profileImage} alt={rep.name} />
                      <div>
                        <p className="text-sm">{rep.name}</p>
                        <p className="text-xs text-gray-500">{rep.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip label={`Batch ${rep.batchYear}`} size="small" color="primary" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={rep.department}
                      size="small"
                      sx={{
                        backgroundColor: rep.department === 'CSE' ? '#a855f7' :
                                       rep.department === 'CTHM' ? '#ef4444' :
                                       rep.department === 'BAA' ? '#eab308' : '#6b7280',
                        color: 'white'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={rep.program} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{new Date(rep.assignedDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-teal-600">{rep.verificationsCount}</span>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={rep.status}
                      size="small"
                      color={rep.status === 'Active' ? 'success' : 'default'}
                      icon={rep.status === 'Active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="small">View Activity</Button>
                      {rep.status === 'Active' && (
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleRemove(rep.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Batch Representative</DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
              <p className="text-xs text-gray-700">
                ⚠️ <strong>Unique Constraint:</strong> Only ONE representative can be assigned per <strong>Batch Year + Department + Program</strong> combination. Assigning a new representative will replace any existing one for that specific combination.
              </p>
            </div>

            {assignError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-600">{assignError}</p>
              </div>
            )}

            <TextField
              fullWidth
              label="Alumni Email"
              placeholder="Enter alumni email to assign as representative"
              helperText="The alumni must be from the exact batch year, department, and program they will represent"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel>Batch Year to Represent</InputLabel>
              <Select label="Batch Year to Represent" value={assignYear} onChange={(e) => setAssignYear(Number(e.target.value))}>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select label="Department" value={assignDept} onChange={(e) => setAssignDept(e.target.value)}>
                <MenuItem key="CSE" value="CSE">CSE - Computer Science & Engineering</MenuItem>
                <MenuItem key="CTHM" value="CTHM">CTHM - Tourism & Hospitality</MenuItem>
                <MenuItem key="BAA" value="BAA">BAA - Business & Accountancy</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Program/Course</InputLabel>
              <Select label="Program/Course" value={assignProg} onChange={(e) => setAssignProg(e.target.value)}>
                <MenuItem key="BSIT" value="BSIT">BSIT - Information Technology</MenuItem>
                <MenuItem key="BSCS" value="BSCS">BSCS - Computer Science</MenuItem>
                <MenuItem key="BSCpE" value="BSCpE">BSCpE - Computer Engineering</MenuItem>
                <MenuItem key="BSIS" value="BSIS">BSIS - Information Systems</MenuItem>
                <MenuItem key="BSHM" value="BSHM">BSHM - Hospitality Management</MenuItem>
                <MenuItem key="BSTM" value="BSTM">BSTM - Tourism Management</MenuItem>
                <MenuItem key="BSHRM" value="BSHRM">BSHRM - Hotel & Restaurant Management</MenuItem>
                <MenuItem key="BSA" value="BSA">BSA - Accountancy</MenuItem>
                <MenuItem key="BSBA" value="BSBA">BSBA - Business Administration</MenuItem>
                <MenuItem key="BSAIS" value="BSAIS">BSAIS - Accounting Information System</MenuItem>
                <MenuItem key="BSE" value="BSE">BSE - Entrepreneurship</MenuItem>
              </Select>
            </FormControl>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAssign}
            className="bg-gradient-to-r from-teal-600 to-green-600"
          >
            Assign Representative
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
