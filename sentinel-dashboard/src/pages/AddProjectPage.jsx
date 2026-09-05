import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import AddProjectForm from '../components/projects/AddProjectForm';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

export default function AddProjectPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pl-64 pt-16">
      <Sidebar />
      <Navbar />

      <main className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Back and title */}
        <div>
          <button 
            onClick={() => navigate('/projects')}
            className="btn-ghost flex items-center gap-1 text-xs mb-4"
          >
            <ChevronLeftIcon className="w-4 h-4" /> Cancel and return
          </button>
          
          <h1 className="text-2xl font-extrabold text-white">Add Project Integration</h1>
          <p className="text-sm text-dark-300 mt-1">
            Connect repositories, sprint boards, and team communication servers to build a failure prediction scan.
          </p>
        </div>

        {/* Form Wizard */}
        <AddProjectForm onSuccess={() => navigate('/projects')} />
      </main>
    </div>
  );
}
