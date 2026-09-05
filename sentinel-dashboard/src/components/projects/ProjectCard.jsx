import React from 'react';
import { Link } from 'react-router-dom';
import { FolderIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import HealthBadge from '../common/HealthBadge';
import DeadlineCountdown from '../common/DeadlineCountdown';
import { timeAgo } from '../../utils/formatDate';

export default function ProjectCard({ project }) {
  const stability = project.latest_stability_score;
  const healthLabel = project.latest_health_label;
  const hasErrors = !!(project.github_error || project.jira_error || project.discord_error);
  
  return (
    <div className="card-hover flex flex-col justify-between h-[220px]">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-primary-600/10 text-primary-400 border border-primary-500/10">
              <FolderIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate leading-tight">
                {project.project_name || project.name || 'Unnamed Project'}
              </h3>
              <span className="text-xs text-dark-400">{project.project_id}</span>
            </div>
          </div>
          {hasErrors ? (
            <span className="badge border border-red-500/20 text-red-400 bg-red-950/20 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
              CONFIG REQUIRED
            </span>
          ) : (
            <HealthBadge label={healthLabel} />
          )}
        </div>

        {/* Top risk driver or desc */}
        {hasErrors ? (
          <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2 text-xs text-red-300 mt-2 line-clamp-2">
            <strong>Configuration Issue:</strong> Telemetry credentials failed validation. Please update settings.
          </div>
        ) : healthLabel === 'AT_RISK' && project.top_risk_driver ? (
          <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2 text-xs text-red-200 mt-2 line-clamp-2">
            <strong>Driver:</strong> {project.top_risk_driver}
          </div>
        ) : (
          <p className="text-xs text-dark-300 line-clamp-2 mt-2">
            {project.description || 'No project description added yet.'}
          </p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-dark-800/80 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold">Stability Score</span>
          <span className={`text-lg font-extrabold ${stability !== null ? (stability >= 70 ? 'text-green-400' : stability >= 40 ? 'text-amber-400' : 'text-red-400') : 'text-dark-400'}`}>
            {stability !== null ? `${stability}%` : 'N/A'}
          </span>
        </div>

        <div className="flex flex-col items-end gap-1">
          <DeadlineCountdown endDate={project.project_end_date} />
          <span className="text-[10px] text-dark-400">Scanned {timeAgo(project.last_scanned_at)}</span>
        </div>

        <Link
          to={`/projects/${project.project_id}`}
          className="btn-icon hover:bg-primary-600/20 hover:text-primary-400 self-end"
          title="View Details"
        >
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
