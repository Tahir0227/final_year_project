import React from 'react';
import { SparklesIcon, FolderIcon, CalendarIcon } from '@heroicons/react/24/outline';
import SeverityBadge from '../common/SeverityBadge';
import { formatDate } from '../../utils/formatDate';
import ActionStepsList from './ActionStepsList';
import HealthBadge from '../common/HealthBadge';

export default function PrescriptionCard({ prescription, project, latestInference }) {
  const isHealthy = (latestInference?.health_label || '').toUpperCase() === 'HEALTHY';

  // If healthy:
  if (isHealthy) {
    if (!prescription) {
      return (
        <div className="space-y-6 animate-fade-in">
          {project && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
                  <FolderIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Project Summary</h3>
                  <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold">Metadata & status snapshot</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-dark-900/40 rounded-lg p-3 border border-dark-800 flex flex-col justify-between min-h-[64px]">
                  <span className="text-dark-400 font-semibold block uppercase tracking-wider text-[9px]">Project Name</span>
                  <span className="text-white font-bold block mt-1 truncate">{project.project_name || project.name}</span>
                </div>
                <div className="bg-dark-900/40 rounded-lg p-3 border border-dark-800 flex flex-col justify-between min-h-[64px]">
                  <span className="text-dark-400 font-semibold block uppercase tracking-wider text-[9px]">Project Deadline</span>
                  <span className="text-white font-bold block mt-1 flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-primary-400" />
                    {formatDate(project.project_end_date)}
                  </span>
                </div>
                <div className="bg-dark-900/40 rounded-lg p-3 border border-dark-800 flex flex-col justify-between min-h-[64px]">
                  <span className="text-dark-400 font-semibold block uppercase tracking-wider text-[9px]">Project Health Status</span>
                  <span className="block mt-1">
                    <HealthBadge label="HEALTHY" />
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="card border-primary-500/10 bg-primary-950/5 p-8 flex flex-col items-center justify-center text-center gap-4">
            <div className="p-4 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 text-2xl font-bold flex items-center justify-center w-16 h-16 shadow-lg shadow-primary-900/10 animate-pulse-slow">
              ⚡
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">AI Project Summary Pending</h3>
              <p className="text-sm text-dark-300 mt-2 max-w-md leading-relaxed">
                Click <strong>"Execute Full Analysis Pipeline"</strong> to trigger the AI engine to generate a summary of the healthy project state.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Prescription exists for healthy project (i.e. the positive summary)
    return (
      <div className="space-y-6 animate-fade-in">
        {project && (
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
                <FolderIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Project Summary</h3>
                <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold">Metadata & status snapshot</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-dark-900/40 rounded-lg p-3 border border-dark-800 flex flex-col justify-between min-h-[64px]">
                <span className="text-dark-400 font-semibold block uppercase tracking-wider text-[9px]">Project Name</span>
                <span className="text-white font-bold block mt-1 truncate">{project.project_name || project.name}</span>
              </div>
              <div className="bg-dark-900/40 rounded-lg p-3 border border-dark-800 flex flex-col justify-between min-h-[64px]">
                <span className="text-dark-400 font-semibold block uppercase tracking-wider text-[9px]">Project Deadline</span>
                <span className="text-white font-bold block mt-1 flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-primary-400" />
                  {formatDate(project.project_end_date)}
                </span>
              </div>
              <div className="bg-dark-900/40 rounded-lg p-3 border border-dark-800 flex flex-col justify-between min-h-[64px]">
                <span className="text-dark-400 font-semibold block uppercase tracking-wider text-[9px]">Project Health Status</span>
                <span className="block mt-1">
                  <HealthBadge label="HEALTHY" />
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <SparklesIcon className="w-5 h-5 animate-pulse-slow" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">AI Project Summary</h3>
                <span className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold">Generated {formatDate(prescription.generated_at)}</span>
              </div>
            </div>
            <SeverityBadge severity={prescription.severity} />
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-dark-400 uppercase font-semibold tracking-wider">AI Summary Description</span>
              <p className="text-sm text-white font-medium mt-1 leading-relaxed whitespace-pre-line">
                {prescription.root_cause_summary}
              </p>
            </div>
            
            <div className="border-t border-dark-800/80 pt-4 mt-4 text-[10px] text-dark-400">
              Prescription ID: <span className="text-dark-200 font-mono">{prescription.id}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="card border-amber-500/20 bg-amber-950/5 p-8 flex flex-col items-center justify-center text-center gap-4 animate-fade-in">
        <div className="p-4 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl font-bold flex items-center justify-center w-16 h-16 shadow-lg shadow-amber-900/10">
          ⚠️
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Prescriptions Pending</h3>
          <p className="text-sm text-amber-200 mt-2 max-w-md leading-relaxed">
            This project is currently classified as <strong>AT_RISK</strong>, but no prescriptive actions are recorded. Click <strong>"Execute Full Analysis Pipeline"</strong> to request a new prescription from the AI engine.
          </p>
        </div>
      </div>
    );
  }

  // Map individual action steps from the database columns
  const actionSteps = [];
  const rawSteps = [
    prescription.action_step_1,
    prescription.action_step_2,
    prescription.action_step_3,
    prescription.action_step_4,
    prescription.action_step_5
  ].filter(Boolean);

  rawSteps.forEach((s, idx) => {
    let priority = 'MEDIUM';
    let timeframe = 'Medium term (2-3 weeks)';
    
    if (idx === 0) {
      priority = 'CRITICAL';
      timeframe = 'Immediate (24-48h)';
    } else if (idx === 1) {
      priority = 'HIGH';
      timeframe = 'Immediate (24-48h)';
    } else if (idx === 2) {
      priority = 'HIGH';
      timeframe = 'Short term (1 week)';
    } else if (idx === 4) {
      priority = 'LOW';
      timeframe = 'Long term (1 month+)';
    }

    actionSteps.push({
      step: `Recommended Step ${idx + 1}`,
      description: s,
      priority,
      timeframe
    });
  });

  return (
    <div className="space-y-6">
      {/* Project Summary Block */}
      {project && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
              <FolderIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Project Summary</h3>
              <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold">Metadata & status snapshot</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-dark-900/40 rounded-lg p-3 border border-dark-800 flex flex-col justify-between min-h-[64px]">
              <span className="text-dark-400 font-semibold block uppercase tracking-wider text-[9px]">Project Name</span>
              <span className="text-white font-bold block mt-1 truncate">{project.project_name || project.name}</span>
            </div>
            <div className="bg-dark-900/40 rounded-lg p-3 border border-dark-800 flex flex-col justify-between min-h-[64px]">
              <span className="text-dark-400 font-semibold block uppercase tracking-wider text-[9px]">Project Deadline</span>
              <span className="text-white font-bold block mt-1 flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-primary-400" />
                {formatDate(project.project_end_date)}
              </span>
            </div>
            <div className="bg-dark-900/40 rounded-lg p-3 border border-dark-800 flex flex-col justify-between min-h-[64px]">
              <span className="text-dark-400 font-semibold block uppercase tracking-wider text-[9px]">Project Health Status</span>
              <span className="block mt-1">
                <HealthBadge label={prescription.health_label || 'AT_RISK'} />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Strategic Assessment & Insight */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <SparklesIcon className="w-5 h-5 animate-pulse-slow" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">AI Strategic Assessment</h3>
              <span className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold">Generated {formatDate(prescription.generated_at)}</span>
            </div>
          </div>
          <SeverityBadge severity={prescription.severity} />
        </div>

        <div className="space-y-4">
          <div>
            <span className="text-[10px] text-dark-400 uppercase font-semibold tracking-wider">Strategic Assessment</span>
            <p className="text-sm text-white font-medium mt-1 leading-relaxed whitespace-pre-line">
              {prescription.root_cause_summary || 'No strategic root cause summary provided.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-dark-800/80 pt-4 mt-4 text-xs">
            <div>
              <span className="text-dark-400 font-semibold block uppercase tracking-wider text-[9px]">Stability Index Score</span>
              <span className="text-white font-bold block mt-0.5">{prescription.stability_score ? `${prescription.stability_score}%` : 'N/A'}</span>
            </div>
            <div>
              <span className="text-dark-400 font-semibold block uppercase tracking-wider text-[9px]">Prescription ID</span>
              <span className="text-dark-200 font-mono block mt-0.5">{prescription.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended steps */}
      {actionSteps.length > 0 && (
        <div className="card">
          <h3 className="section-title mb-2">Recommended Operational Steps</h3>
          <p className="text-xs text-dark-400 mb-6">Specific prescriptive steps compiled by the LangChain model</p>
          <ActionStepsList steps={actionSteps} />
        </div>
      )}
    </div>
  );
}
