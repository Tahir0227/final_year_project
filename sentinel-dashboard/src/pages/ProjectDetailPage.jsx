import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import ScanStatusIndicator from '../components/projects/ScanStatusIndicator';
import HealthGauge from '../components/health/HealthGauge';
import StabilityChart from '../components/health/StabilityChart';
import RiskHeatmap from '../components/health/RiskHeatmap';
import TelemetryPanel from '../components/health/TelemetryPanel';
import AlertFeed from '../components/alerts/AlertFeed';
import PrescriptionCard from '../components/prescription/PrescriptionCard';
import ConfirmModal from '../components/common/ConfirmModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { projectService } from '../services/projectService';
import { formatDateTime } from '../utils/formatDate';
import SettingsPanel from '../components/projects/SettingsPanel';
import {
  ArrowPathIcon,
  TrashIcon,
  ChevronLeftIcon,
  ShieldCheckIcon,
  CodeBracketSquareIcon,
  BellAlertIcon,
  SparklesIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab State
  const [activeTab, setActiveTab] = useState('health');

  // Action states
  const [isRescanning, setIsRescanning] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const loadProjectDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getById(id);
      setDetail(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch project detail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectDetail();
  }, [id]);

  const handleRescan = async () => {
    setIsRescanning(true);
    toast.loading('Phase 1/3: Ingesting telemetry data from GitHub, Jira, and Discord...', { id: 'scan-toast' });
    
    // Update toast message sequentially to guide user through backend pipeline phases
    const phase2Timeout = setTimeout(() => {
      toast.loading('Phase 2/3: Telemetry received. Running ML model predictions & anomaly detection...', { id: 'scan-toast' });
    }, 4000);

    const phase3Timeout = setTimeout(() => {
      toast.loading('Phase 3/3: Evaluating failure risk. Querying AI Prescription Engine for actionable steps...', { id: 'scan-toast' });
    }, 9000);

    try {
      const result = await projectService.rescan(id);
      clearTimeout(phase2Timeout);
      clearTimeout(phase3Timeout);
      
      toast.success('Full pipeline analysis complete! Project health status, alerts, and AI prescriptions updated.', { id: 'scan-toast' });
      // Reload details to display updated metrics
      await loadProjectDetail();
    } catch (err) {
      clearTimeout(phase2Timeout);
      clearTimeout(phase3Timeout);
      toast.error(err.response?.data?.error || 'Full pipeline execution failed.', { id: 'scan-toast' });
    } finally {
      setIsRescanning(false);
    }
  };

  const handleDelete = async () => {
    try {
      await projectService.delete(id);
      toast.success('Project deleted successfully.');
      navigate('/projects');
    } catch (err) {
      toast.error('Failed to delete project.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pl-64 pt-16 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pl-64 pt-16 p-6">
        <Sidebar />
        <Navbar />
        <ErrorMessage message={error} onRetry={loadProjectDetail} />
      </div>
    );
  }

  const { project, latest_scan, latest_inference, latest_prescription, health_history } = detail;

  const tabs = [
    { id: 'health', name: 'Health Assessment', icon: ShieldCheckIcon },
    { id: 'telemetry', name: 'Operational Metrics', icon: CodeBracketSquareIcon },
    { id: 'alerts', name: 'Alerts & History', icon: BellAlertIcon },
    { id: 'prescriptions', name: 'AI Prescriptions', icon: SparklesIcon },
    { id: 'settings', name: 'Integration Settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="min-h-screen pl-64 pt-16">
      <Sidebar />
      <Navbar />

      <main className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Back and Action controls */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/projects')}
            className="btn-ghost flex items-center gap-1 text-xs"
          >
            <ChevronLeftIcon className="w-4 h-4" /> Back to projects
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleRescan}
              disabled={isRescanning}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isRescanning ? 'animate-spin' : ''}`} />
              {isRescanning ? 'Executing Analysis...' : 'Execute Full Analysis Pipeline'}
            </button>
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="btn-secondary text-xs flex items-center gap-1.5 border-red-500/20 text-red-400 hover:bg-red-950/20"
            >
              <TrashIcon className="w-4 h-4" /> Delete Project
            </button>
          </div>
        </div>

        {/* Title and Metadata Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            {project?.project_name || project?.name || 'Unnamed Project'}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-dark-400">
            <span>ID: <strong className="text-dark-200">{project?.project_id}</strong></span>
            <span>•</span>
            <span>Target Deadline: <strong className="text-dark-200">{project?.project_end_date}</strong></span>
            <span>•</span>
            <span>Scan Schedule: <strong className="text-dark-200">Every {Number(project?.scan_interval_minutes || 1440) / 60} hour(s)</strong></span>
          </div>
        </div>

        {/* Credential Integration Error Alert */}
        {(project?.github_error || project?.jira_error || project?.discord_error) && (
          <div className="bg-red-950/40 border border-red-500/20 rounded-xl p-5 mb-6 animate-pulse-slow">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-red-200">Integration Configuration Required</h4>
                <p className="text-xs text-red-300">
                  One or more external integrations are failing with incorrect credentials. Prediction and AI analysis services are disabled until these configuration details are corrected.
                </p>
                <div className="mt-3 space-y-1.5 pl-4 list-disc text-xs text-red-400">
                  {project.github_error && (
                    <div>• <strong className="text-red-300">GitHub:</strong> {project.github_error}</div>
                  )}
                  {project.jira_error && (
                    <div>• <strong className="text-red-300">Jira:</strong> {project.jira_error}</div>
                  )}
                  {project.discord_error && (
                    <div>• <strong className="text-red-300">Discord:</strong> {project.discord_error}</div>
                  )}
                </div>
                <div className="pt-2">
                  <button 
                    onClick={() => setActiveTab('settings')}
                    className="text-xs font-semibold text-red-300 hover:text-white underline"
                  >
                    Go to Integration Settings to correct these fields
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scanning status banner */}
        <ScanStatusIndicator
          status={latest_scan?.status}
          lastScannedAt={latest_scan?.scanned_at}
          nextScanAt={project?.next_scheduled_scan}
          isRescanning={isRescanning}
        />

        {/* Tab Controls */}
        <div className="border-b border-dark-800 flex gap-4 overflow-x-auto pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold text-xs transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-white'
                    : 'border-transparent text-dark-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Tab Body Contents */}
        <div className="mt-6">
          {activeTab === 'health' && (project?.github_error || project?.jira_error || project?.discord_error) && (
            <div className="card p-10 border border-dark-800 flex flex-col items-center justify-center text-center space-y-4">
              <ShieldCheckIcon className="w-16 h-16 text-dark-600" />
              <h3 className="text-base font-bold text-white">Health Analysis Unavailable</h3>
              <p className="text-xs text-dark-300 max-w-md">
                Health predictions and risk evaluations are disabled because the project credentials are currently invalid. Please update your integration credentials in the settings tab.
              </p>
              <button onClick={() => setActiveTab('settings')} className="btn-secondary text-xs">
                Open Integration Settings
              </button>
            </div>
          )}

          {activeTab === 'health' && !(project?.github_error || project?.jira_error || project?.discord_error) && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <HealthGauge
                  score={latest_inference?.stability_score}
                  label={latest_inference?.health_label}
                  anomalyDetected={latest_inference?.anomaly_detected}
                />
                <div className="lg:col-span-2">
                  <StabilityChart history={health_history} />
                </div>
              </div>
              <RiskHeatmap inference={latest_inference} />
            </div>
          )}

          {activeTab === 'telemetry' && (
            <TelemetryPanel telemetry={latest_scan} />
          )}

          {activeTab === 'alerts' && (
            <AlertFeed alerts={health_history} />
          )}

          {activeTab === 'prescriptions' && (project?.github_error || project?.jira_error || project?.discord_error) && (
            <div className="card p-10 border border-dark-800 flex flex-col items-center justify-center text-center space-y-4">
              <SparklesIcon className="w-16 h-16 text-dark-600" />
              <h3 className="text-base font-bold text-white">AI Prescriptions Unavailable</h3>
              <p className="text-xs text-dark-300 max-w-md">
                Action plans and AI prescriptions are disabled because the project credentials are currently invalid. Please update your integration credentials in the settings tab.
              </p>
              <button onClick={() => setActiveTab('settings')} className="btn-secondary text-xs">
                Open Integration Settings
              </button>
            </div>
          )}

          {activeTab === 'prescriptions' && !(project?.github_error || project?.jira_error || project?.discord_error) && (
            <PrescriptionCard 
              prescription={latest_prescription} 
              project={project} 
              latestInference={latest_inference}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPanel 
              project={project} 
              onUpdateSuccess={loadProjectDetail} 
            />
          )}
        </div>

        {/* Confirm Project Deletion Modal */}
        <ConfirmModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDelete}
          title="Delete Project Integration"
          message={`Are you sure you want to delete ${project?.project_name}? All associated metrics, scans, and AI prescription logs will be archived.`}
          confirmText="Yes, delete project"
          isDanger={true}
        />
      </main>
    </div>
  );
}
