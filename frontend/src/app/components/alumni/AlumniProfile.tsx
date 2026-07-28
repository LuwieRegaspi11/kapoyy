import React, { useState } from 'react';
import { Card, CardContent, TextField, Button, Chip, Avatar } from '@mui/material';
import { useAuth } from '../AuthContext';
import { Mail, Phone, MapPin, Calendar, GraduationCap, Building, Edit, Camera } from 'lucide-react';

export default function AlumniProfile() {
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState(user?.profileImage || 'https://ui-avatars.com/api/?name=User&background=0ea5e9&color=fff');

  const profileData = {
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '+63 912 345 6789',
    address: '123 Main Street, Manila, Philippines',
    department: user?.department || 'CSE',
    batchYear: user?.batchYear || 2020,
    studentId: 'ALM-2020-0123',
    graduationDate: '2020-06-15',
    currentEmployment: 'Software Developer at Tech Corp',
    verified: true
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl mb-1">My Profile</h2>
          <p className="text-gray-600">Manage your alumni profile information</p>
        </div>
        <Button
          variant="contained"
          startIcon={<Edit className="w-4 h-4" />}
          className="bg-blue-600"
        >
          Edit Profile
        </Button>
      </div>

      {/* Profile Image Section */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar
                src={profileImage}
                alt={user?.name}
                sx={{ width: 120, height: 120 }}
              />
              <label htmlFor="profile-image-upload" className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                <Camera className="w-4 h-4" />
                <input
                  id="profile-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex-1">
              <h3 className="text-xl mb-1">{user?.name}</h3>
              <p className="text-gray-600 mb-2">{user?.email}</p>
              <div className="flex items-center gap-2">
                <Chip label={`${user?.department} • Batch ${user?.batchYear}`} size="small" color="primary" />
                <Chip label="Verified Alumni" size="small" color="success" icon={<GraduationCap className="w-3 h-3" />} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Status */}
      <Card className="bg-green-50 border-green-200">
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <GraduationCap className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm mb-1">Profile Verification Status</h3>
              <p className="text-xs text-gray-700">
                Your profile has been verified by the Asian College Alumni Office.
              </p>
            </div>
            <Chip label="Verified" color="success" />
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardContent>
          <h3 className="text-lg mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              fullWidth
              label="Full Name"
              value={profileData.fullName}
              InputProps={{ readOnly: true }}
            />
            <TextField
              fullWidth
              label="Email Address"
              value={profileData.email}
              InputProps={{
                readOnly: true,
                startAdornment: <Mail className="w-4 h-4 text-gray-400 mr-2" />
              }}
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={profileData.phone}
              InputProps={{
                startAdornment: <Phone className="w-4 h-4 text-gray-400 mr-2" />
              }}
            />
            <TextField
              fullWidth
              label="Address"
              value={profileData.address}
              InputProps={{
                startAdornment: <MapPin className="w-4 h-4 text-gray-400 mr-2" />
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Academic Information */}
      <Card>
        <CardContent>
          <h3 className="text-lg mb-4">Academic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              fullWidth
              label="Student ID"
              value={profileData.studentId}
              InputProps={{ readOnly: true }}
            />
            <TextField
              fullWidth
              label="Department"
              value={profileData.department}
              InputProps={{ readOnly: true }}
            />
            <TextField
              fullWidth
              label="Batch Year"
              value={profileData.batchYear}
              InputProps={{
                readOnly: true,
                startAdornment: <Calendar className="w-4 h-4 text-gray-400 mr-2" />
              }}
            />
            <TextField
              fullWidth
              label="Graduation Date"
              value={new Date(profileData.graduationDate).toLocaleDateString()}
              InputProps={{ readOnly: true }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Current Employment */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg">Current Employment</h3>
            <Button variant="outlined" size="small">
              Update Employment
            </Button>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm">{profileData.currentEmployment}</p>
              <p className="text-xs text-gray-600 mt-1">Updated 2 months ago</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent>
          <h4 className="text-sm mb-2">Privacy & Data Protection</h4>
          <p className="text-xs text-gray-700">
            Your personal information is protected under RA 10173 (Data Privacy Act of 2012).
            Only authorized personnel can access your full profile. Faculty and staff see limited information
            unless you grant additional permissions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
