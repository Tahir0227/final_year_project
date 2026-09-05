import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import ProjectCard from '../components/projects/ProjectCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import { projectService } from '../services/projectService';
import { FolderIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [filterHealth, setFilterHealth] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getAll();
      setProjects(data);
    } catch (err) {
      setError('Failed to fetch projects list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Filter projects by search query and dropdown filters
  const filteredProjects = projects.filter(p => {
    const name = p.project_name || p.name || '';
    const id = p.project_id || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || 
                          id.toLowerCase().includes(search.toLowerCase());
    
    const label = p.latest_health_label || 'HEALTHY';
    const matchesFilter = filterHealth === 'ALL' || label.toUpperCase() === filterHealth;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen pl-64 pt-16">
      <Sidebar />
      <Navbar />

      <main className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">My Projects</h1>
            <p className="text-sm text-dark-300 mt-1">Manage and track failure risk attributions across active integrations</p>
          </div>
          <Link to="/add-project" className="btn-primary">
            <PlusIcon className="w-5 h-5" /> Add Project
          </Link>
        </div>

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-dark-850 border border-dark-800 p-4 rounded-2xl">
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project ID or name..."
              className="input pl-10 py-2.5 text-sm"
            />
            <MagnifyingGlassIcon className="w-5 h-5 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-dark-300 whitespace-nowrap">Filter Status:</span>
            <select
              value={filterHealth}
              onChange={(e) => setFilterHealth(e.target.value)}
              className="input py-2 px-3 text-xs w-full sm:w-36 bg-dark-900 border-dark-700"
            >
              <option value="ALL">All Projects</option>
              <option value="HEALTHY">Healthy</option>
              <option value="AT_RISK">At Risk</option>
            </select>
          </div>
        </div>

        {/* Main List */}
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchProjects} />
        ) : filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((p) => (
              <ProjectCard key={p.project_id} project={p} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={search || filterHealth !== 'ALL' ? 'No matching projects' : 'No active projects'}
            description={search || filterHealth !== 'ALL' ? 'Try refining your search terms or filters.' : 'Add your first repository integration to trigger scans.'}
            icon={FolderIcon}
            action={
              !search && filterHealth === 'ALL' ? (
                <Link to="/add-project" className="btn-primary">
                  <PlusIcon className="w-5 h-5" /> Add Project
                </Link>
              ) : null
            }
          />
        )}
      </main>
    </div>
  );
}
