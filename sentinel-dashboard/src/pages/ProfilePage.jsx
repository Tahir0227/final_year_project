import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { formatDate } from '../utils/formatDate';
import {
  UserCircleIcon,
  PencilSquareIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditClick = () => {
    setFormData({
      full_name: user?.full_name || '',
      current_password: '',
      new_password: '',
      confirm_new_password: '',
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    if (formData.new_password || formData.confirm_new_password) {
      if (formData.new_password !== formData.confirm_new_password) {
        toast.error('New passwords do not match.');
        return;
      }
      if (!formData.current_password) {
        toast.error('Please enter your current password to update security settings.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        full_name: formData.full_name,
      };
      if (formData.new_password) {
        payload.current_password = formData.current_password;
        payload.new_password = formData.new_password;
      }

      const res = await authService.updateProfile(payload);
      if (res.user) {
        updateUser(res.user);
      }

      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      const errDetails = err.response?.data?.errors;
      if (errDetails && Array.isArray(errDetails)) {
        errDetails.forEach(e => toast.error(e.msg));
      } else {
        toast.error(err.response?.data?.error || 'Profile update failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pl-64 pt-16">
      <Sidebar />
      <Navbar />

      <main className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">User Profile</h1>
            <p className="text-sm text-dark-300 mt-1">Manage user account profile details and authentication credentials</p>
          </div>

          {!isEditing ? (
            <button
              onClick={handleEditClick}
              className="btn-primary flex items-center gap-2"
            >
              <PencilSquareIcon className="w-5 h-5" />
              Edit Profile
            </button>
          ) : (
            <button
              onClick={handleCancel}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Details
            </button>
          )}
        </div>

        {!isEditing ? (
          /* READ-ONLY VIEW MODE */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Avatar Card */}
            <div className="card md:col-span-1 flex flex-col items-center justify-center text-center p-8 border border-dark-800 space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-primary-600/10 text-primary-400 border-2 border-primary-500/20 flex items-center justify-center shadow-inner">
                  <UserCircleIcon className="w-16 h-16" />
                </div>
                <div className="absolute bottom-0 right-0 p-1.5 bg-green-500 rounded-full border-2 border-dark-900" title="Account Active" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white leading-snug">{user?.full_name || 'User'}</h3>
                <p className="text-xs text-dark-400 font-medium mt-0.5">{user?.email}</p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold">
                <ShieldCheckIcon className="w-4 h-4" />
                Authenticated User
              </div>
            </div>

            {/* Account Details Breakdown Card */}
            <div className="card md:col-span-2 p-6 border border-dark-800 space-y-6">
              <div className="border-b border-dark-800 pb-4">
                <h3 className="text-base font-bold text-white">Account Details</h3>
                <p className="text-xs text-dark-400">Personal information and system account status</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-dark-400 flex items-center gap-1.5">
                    <UserCircleIcon className="w-4 h-4 text-primary-400" /> Full Name
                  </span>
                  <p className="text-sm font-bold text-white">{user?.full_name || 'N/A'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-dark-400 flex items-center gap-1.5">
                    <EnvelopeIcon className="w-4 h-4 text-primary-400" /> Email Address
                  </span>
                  <p className="text-sm font-bold text-white">{user?.email || 'N/A'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-dark-400 flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-primary-400" /> Joined Date
                  </span>
                  <p className="text-sm font-bold text-white">{formatDate(user?.created_at, 'MMMM d, yyyy')}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-dark-400 flex items-center gap-1.5">
                    <ClockIcon className="w-4 h-4 text-primary-400" /> Last Activity
                  </span>
                  <p className="text-sm font-bold text-white">{formatDate(user?.last_login, 'MMM d, yyyy • h:mm a') || 'Active Session'}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* EDIT PROFILE & PASSWORD UPDATE MODE */
          <div className="card p-8 border border-dark-800 space-y-6">
            <div className="border-b border-dark-800 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Update Profile Details</h3>
                <p className="text-xs text-dark-400">Modify your display name or update account password</p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs text-dark-400 hover:text-white underline"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-6">
              {/* Full Name Section */}
              <div className="space-y-2">
                <label className="label">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="input"
                  required
                />
              </div>

              {/* Password Change Section */}
              <div className="pt-4 border-t border-dark-800 space-y-4">
                <div className="flex items-center gap-2">
                  <KeyIcon className="w-5 h-5 text-primary-400" />
                  <h4 className="text-sm font-bold text-white">Change Password (Optional)</h4>
                </div>
                <p className="text-xs text-dark-400">
                  Leave password fields blank if you only want to update your profile name.
                </p>

                <div className="space-y-2">
                  <label className="label">Current Password</label>
                  <input
                    type="password"
                    name="current_password"
                    value={formData.current_password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="input"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="label">New Password</label>
                    <input
                      type="password"
                      name="new_password"
                      value={formData.new_password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="input"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="label">Confirm New Password</label>
                    <input
                      type="password"
                      name="confirm_new_password"
                      value={formData.confirm_new_password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="input"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-dark-400">
                  Password must be at least 8 characters and contain uppercase, number, and special character.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-dark-800">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-secondary px-6"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-8 flex items-center gap-2"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
