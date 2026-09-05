import React from 'react';
import CredentialField from '../CredentialField';

export default function GithubStep({ data, onChange, errors, testState, onTest }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Repository Owner</label>
          <input
            type="text"
            name="github_owner"
            value={data.github_owner || ''}
            onChange={onChange}
            placeholder="e.g. Tahir0227"
            className={`input ${errors.github_owner ? 'input-error' : ''}`}
          />
          {errors.github_owner && <span className="text-xs text-red-400 font-medium">{errors.github_owner}</span>}
        </div>

        <div>
          <label className="label">Repository Name</label>
          <input
            type="text"
            name="github_repo"
            value={data.github_repo || ''}
            onChange={onChange}
            placeholder="e.g. my-software-project"
            className={`input ${errors.github_repo ? 'input-error' : ''}`}
          />
          {errors.github_repo && <span className="text-xs text-red-400 font-medium">{errors.github_repo}</span>}
        </div>
      </div>

      <div>
        <CredentialField
          label="GitHub Personal Access Token (PAT)"
          name="github_token"
          value={data.github_token || ''}
          onChange={onChange}
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          error={errors.github_token}
          testLoading={testState.loading}
          testSuccess={testState.success}
          testError={testState.error}
          onTest={onTest}
        />
        <p className="text-[10px] text-dark-400 mt-1">
          Requires <code>repo</code> and <code>read:user</code> scopes to pull commit frequency, pull requests, and collaborator stats.
        </p>
      </div>
    </div>
  );
}
