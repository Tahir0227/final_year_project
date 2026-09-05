import React, { useState } from 'react';
import { projectService } from '../../services/projectService';
import CredentialField from './CredentialField';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  FolderIcon, 
  CodeBracketIcon, 
  CircleStackIcon, 
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function SettingsPanel({ project, onUpdateSuccess }) {
  const [formData, setFormData] = useState({
    project_name: project.project_name || project.name || '',
    description: project.description || '',
    project_end_date: project.project_end_date || '',
    scan_interval_minutes: project.scan_interval_minutes || 1440,
    github_owner: project.github_owner || '',
    github_repo: project.github_repo || '',
    github_token: '',
    jira_base_url: project.jira_base_url || '',
    jira_email: project.jira_email || '',
    jira_api_token: '',
    jira_project_key: project.jira_project_key || '',
    discord_bot_token: '',
    discord_guild_id: project.discord_guild_id || '',
    discord_channel_id: project.discord_channel_id || ''
  });

  const [saving, setSaving] = useState(false);
  
  // Single field credential testing state
  const [testStates, setTestStates] = useState({
    github: { loading: false, success: null, error: null },
    jira: { loading: false, success: null, error: null },
    discord: { loading: false, success: null, error: null }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTestConnection = async (type) => {
    setTestStates(prev => ({
      ...prev,
      [type]: { loading: true, success: null, error: null }
    }));

    try {
      let testData = { project_id: project.project_id };
      if (type === 'github') {
        testData = {
          ...testData,
          owner: formData.github_owner,
          repo: formData.github_repo,
          token: formData.github_token
        };
      } else if (type === 'jira') {
        testData = {
          ...testData,
          baseUrl: formData.jira_base_url,
          email: formData.jira_email,
          apiToken: formData.jira_api_token,
          projectKey: formData.jira_project_key
        };
      } else if (type === 'discord') {
        testData = {
          ...testData,
          botToken: formData.discord_bot_token,
          guildId: formData.discord_guild_id,
          channelId: formData.discord_channel_id
        };
      }

      const res = await projectService.testCredential(type, testData);
      setTestStates(prev => ({
        ...prev,
        [type]: { loading: false, success: res.valid, error: res.error || null }
      }));
      if (res.valid) {
        toast.success(`${type.toUpperCase()} integration verified successfully!`);
      } else {
        toast.error(`${type.toUpperCase()} integration check failed.`);
      }
    } catch (err) {
      setTestStates(prev => ({
        ...prev,
        [type]: { loading: false, success: false, error: err.message || 'Connection failed' }
      }));
      toast.error(err.message || 'Connection test failed.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project_name) {
      toast.error('Project Name is required.');
      return;
    }

    setSaving(true);
    try {
      // Build request body: exclude credentials if unchanged (left blank)
      const payload = { ...formData };
      if (!payload.github_token) delete payload.github_token;
      if (!payload.jira_api_token) delete payload.jira_api_token;
      if (!payload.discord_bot_token) delete payload.discord_bot_token;

      await projectService.update(project.project_id, payload);
      toast.success('Project configuration updated successfully.');
      
      // Call parent success hook to reload details
      if (onUpdateSuccess) {
        await onUpdateSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update project settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      {/* 1. General Project Details */}
      <div className="card p-6 border border-dark-800 space-y-4">
        <div className="flex items-center gap-2 border-b border-dark-800 pb-3 mb-2">
          <FolderIcon className="w-5 h-5 text-primary-500" />
          <h3 className="text-base font-bold text-white">General Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="label">Project Name</label>
            <input
              type="text"
              name="project_name"
              value={formData.project_name}
              onChange={handleChange}
              placeholder="e.g. My Nextjs App"
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="label">Project Target Deadline</label>
              <input
                type="date"
                name="project_end_date"
                value={formData.project_end_date}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="label">Scan Interval</label>
              <select
                name="scan_interval_minutes"
                value={formData.scan_interval_minutes}
                onChange={handleChange}
                className="input"
              >
                <option value="60">Every 1 Hour</option>
                <option value="180">Every 3 Hours</option>
                <option value="360">Every 6 Hours</option>
                <option value="720">Every 12 Hours</option>
                <option value="1440">Every 24 Hours</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="label">Project Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Brief project details..."
            rows="3"
            className="input resize-none py-2"
          />
        </div>
      </div>

      {/* 2. GitHub Integration */}
      <div className="card p-6 border border-dark-800 space-y-4">
        <div className="flex items-center gap-2 border-b border-dark-800 pb-3 mb-2">
          <CodeBracketIcon className="w-5 h-5 text-primary-500" />
          <h3 className="text-base font-bold text-white">GitHub Integration</h3>
        </div>

        {project?.github_error && (
          <div className="text-xs font-semibold text-red-400 bg-red-950/20 border border-red-500/10 rounded-lg p-3">
            ⚠ Connection Error: {project.github_error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="label">Repository Owner (Username/Org)</label>
            <input
              type="text"
              name="github_owner"
              value={formData.github_owner}
              onChange={handleChange}
              placeholder="e.g. facebook"
              className="input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="label">Repository Name</label>
            <input
              type="text"
              name="github_repo"
              value={formData.github_repo}
              onChange={handleChange}
              placeholder="e.g. react"
              className="input"
            />
          </div>
        </div>

        <CredentialField
          label="GitHub Personal Access Token"
          name="github_token"
          value={formData.github_token}
          onChange={handleChange}
          isEdit={true}
          testLoading={testStates.github.loading}
          testSuccess={testStates.github.success}
          testError={testStates.github.error}
          onTest={() => handleTestConnection('github')}
        />
      </div>

      {/* 3. Jira Integration */}
      <div className="card p-6 border border-dark-800 space-y-4">
        <div className="flex items-center gap-2 border-b border-dark-800 pb-3 mb-2">
          <CircleStackIcon className="w-5 h-5 text-primary-500" />
          <h3 className="text-base font-bold text-white">Jira Sprint Board Integration</h3>
        </div>

        {project?.jira_error && (
          <div className="text-xs font-semibold text-red-400 bg-red-950/20 border border-red-500/10 rounded-lg p-3">
            ⚠ Connection Error: {project.jira_error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="label">Jira Base URL</label>
            <input
              type="text"
              name="jira_base_url"
              value={formData.jira_base_url}
              onChange={handleChange}
              placeholder="e.g. https://company.atlassian.net"
              className="input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="label">Jira Project Key</label>
            <input
              type="text"
              name="jira_project_key"
              value={formData.jira_project_key}
              onChange={handleChange}
              placeholder="e.g. PROJ"
              className="input"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="label">Jira Login Email</label>
          <input
            type="email"
            name="jira_email"
            value={formData.jira_email}
            onChange={handleChange}
            placeholder="email@company.com"
            className="input"
          />
        </div>

        <CredentialField
          label="Jira API Token"
          name="jira_api_token"
          value={formData.jira_api_token}
          onChange={handleChange}
          isEdit={true}
          testLoading={testStates.jira.loading}
          testSuccess={testStates.jira.success}
          testError={testStates.jira.error}
          onTest={() => handleTestConnection('jira')}
        />
      </div>

      {/* 5. Discord Integration */}
      <div className="card p-6 border border-dark-800 space-y-4">
        <div className="flex items-center gap-2 border-b border-dark-800 pb-3 mb-2">
          <ChatBubbleLeftRightIcon className="w-5 h-5 text-primary-500" />
          <h3 className="text-base font-bold text-white">Discord Communication Integration</h3>
        </div>

        {project?.discord_error && (
          <div className="text-xs font-semibold text-red-400 bg-red-950/20 border border-red-500/10 rounded-lg p-3">
            ⚠ Connection Error: {project.discord_error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="label">Discord Server (Guild) ID</label>
            <input
              type="text"
              name="discord_guild_id"
              value={formData.discord_guild_id}
              onChange={handleChange}
              placeholder="Guild ID digit string"
              className="input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="label">Alerts Channel ID</label>
            <input
              type="text"
              name="discord_channel_id"
              value={formData.discord_channel_id}
              onChange={handleChange}
              placeholder="Channel ID digit string"
              className="input"
            />
          </div>
        </div>

        <CredentialField
          label="Discord Bot Token"
          name="discord_bot_token"
          value={formData.discord_bot_token}
          onChange={handleChange}
          isEdit={true}
          testLoading={testStates.discord.loading}
          testSuccess={testStates.discord.success}
          testError={testStates.discord.error}
          onTest={() => handleTestConnection('discord')}
        />
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 border-t border-dark-800 pt-6">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary px-8 flex items-center gap-2"
        >
          {saving ? (
            <>
              <LoadingSpinner size="sm" />
              Saving Settings...
            </>
          ) : (
            <>
              <ShieldCheckIcon className="w-5 h-5" />
              Save Configuration Settings
            </>
          )}
        </button>
      </div>
    </form>
  );
}
