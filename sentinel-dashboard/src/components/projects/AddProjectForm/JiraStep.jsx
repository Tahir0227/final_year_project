import React from 'react';
import CredentialField from '../CredentialField';

export default function JiraStep({ data, onChange, errors, testState, onTest }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Jira Base URL</label>
          <input
            type="text"
            name="jira_base_url"
            value={data.jira_base_url || ''}
            onChange={onChange}
            placeholder="e.g. https://yourcompany.atlassian.net"
            className={`input ${errors.jira_base_url ? 'input-error' : ''}`}
          />
          {errors.jira_base_url && <span className="text-xs text-red-400 font-medium">{errors.jira_base_url}</span>}
        </div>

        <div>
          <label className="label">Jira Project Key</label>
          <input
            type="text"
            name="jira_project_key"
            value={data.jira_project_key || ''}
            onChange={onChange}
            placeholder="e.g. PROJ"
            className={`input ${errors.jira_project_key ? 'input-error' : ''}`}
          />
          {errors.jira_project_key && <span className="text-xs text-red-400 font-medium">{errors.jira_project_key}</span>}
        </div>
      </div>

      <div>
        <label className="label">Atlassian Account Email</label>
        <input
          type="email"
          name="jira_email"
          value={data.jira_email || ''}
          onChange={onChange}
          placeholder="name@company.com"
          className={`input ${errors.jira_email ? 'input-error' : ''}`}
        />
        {errors.jira_email && <span className="text-xs text-red-400 font-medium">{errors.jira_email}</span>}
      </div>

      <div>
        <CredentialField
          label="Atlassian API Token"
          name="jira_api_token"
          value={data.jira_api_token || ''}
          onChange={onChange}
          placeholder="ATATT3xFfGF0zxxxxxxxxxxxxxxxxxxxx"
          error={errors.jira_api_token}
          testLoading={testState.loading}
          testSuccess={testState.success}
          testError={testState.error}
          onTest={onTest}
        />
        <p className="text-[10px] text-dark-400 mt-1">
          Generate an API token from your Atlassian Account Security settings to track issues backlog, sprints, and task aging.
        </p>
      </div>
    </div>
  );
}
