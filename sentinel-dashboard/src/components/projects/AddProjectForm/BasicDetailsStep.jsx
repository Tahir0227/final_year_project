import React from 'react';

export default function BasicDetailsStep({ data, onChange, errors }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="label">Project Name</label>
        <input
          type="text"
          name="project_name"
          value={data.project_name || ''}
          onChange={onChange}
          placeholder="e.g. My Software Product"
          className={`input ${errors.project_name ? 'input-error' : ''}`}
        />
        {errors.project_name && <span className="text-xs text-red-400 font-medium">{errors.project_name}</span>}
      </div>

      <div>
        <label className="label">Description (Optional)</label>
        <textarea
          name="description"
          value={data.description || ''}
          onChange={onChange}
          placeholder="A brief summary describing the goals and scope of this software project..."
          rows={4}
          className="input resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Project Deadline</label>
          <input
            type="date"
            name="project_end_date"
            value={data.project_end_date || ''}
            onChange={onChange}
            className={`input ${errors.project_end_date ? 'input-error' : ''}`}
          />
          {errors.project_end_date && <span className="text-xs text-red-400 font-medium">{errors.project_end_date}</span>}
        </div>

        <div>
          <label className="label">Scan Schedule Interval</label>
          <select
            name="scan_interval_minutes"
            value={data.scan_interval_minutes || 1440}
            onChange={onChange}
            className="input"
          >
            <option value={60}>Every 1 Hour</option>
            <option value={360}>Every 6 Hours</option>
            <option value={720}>Every 12 Hours</option>
            <option value={1440}>Every 24 Hours (Daily)</option>
            <option value={10080}>Every 7 Days (Weekly)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
