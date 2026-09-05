import React, { useState } from 'react';
import BasicDetailsStep from './BasicDetailsStep';
import GithubStep from './GithubStep';
import JiraStep from './JiraStep';
import DiscordStep from './DiscordStep';
import ReviewStep from './ReviewStep';
import { projectService } from '../../../services/projectService';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 1, name: 'Basic Details' },
  { id: 2, name: 'GitHub Setup' },
  { id: 3, name: 'Jira Config' },
  { id: 4, name: 'Discord Integration' },
  { id: 5, name: 'Review & Launch' },
];

const INITIAL_DATA = {
  project_name: '',
  description: '',
  project_end_date: '',
  scan_interval_minutes: 1440,
  github_owner: '',
  github_repo: '',
  github_token: '',
  jira_base_url: '',
  jira_project_key: '',
  jira_email: '',
  jira_api_token: '',
  discord_guild_id: '',
  discord_channel_id: '',
  discord_bot_token: '',
};

export default function AddProjectForm({ onSuccess }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(INITIAL_DATA);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Connection testing states
  const [githubTest, setGithubTest] = useState({ loading: false, success: null, error: null });
  const [jiraTest, setJiraTest] = useState({ loading: false, success: null, error: null });
  const [discordTest, setDiscordTest] = useState({ loading: false, success: null, error: null });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleTestGithub = async () => {
    if (!data.github_owner || !data.github_repo || !data.github_token) {
      setErrors(prev => ({
        ...prev,
        github_owner: !data.github_owner ? 'Required' : null,
        github_repo: !data.github_repo ? 'Required' : null,
        github_token: !data.github_token ? 'Required' : null,
      }));
      return;
    }
    setGithubTest({ loading: true, success: null, error: null });
    try {
      const res = await projectService.testCredential('github', {
        owner: data.github_owner,
        repo: data.github_repo,
        token: data.github_token,
      });
      if (res.valid) {
        setGithubTest({ loading: false, success: true, error: null });
        toast.success('GitHub connection validated!');
      } else {
        setGithubTest({ loading: false, success: false, error: res.error });
      }
    } catch (err) {
      setGithubTest({ loading: false, success: false, error: err.response?.data?.error || err.message });
    }
  };

  const handleTestJira = async () => {
    if (!data.jira_base_url || !data.jira_project_key || !data.jira_email || !data.jira_api_token) {
      setErrors(prev => ({
        ...prev,
        jira_base_url: !data.jira_base_url ? 'Required' : null,
        jira_project_key: !data.jira_project_key ? 'Required' : null,
        jira_email: !data.jira_email ? 'Required' : null,
        jira_api_token: !data.jira_api_token ? 'Required' : null,
      }));
      return;
    }
    setJiraTest({ loading: true, success: null, error: null });
    try {
      const res = await projectService.testCredential('jira', {
        baseUrl: data.jira_base_url,
        projectKey: data.jira_project_key,
        email: data.jira_email,
        apiToken: data.jira_api_token,
      });
      if (res.valid) {
        setJiraTest({ loading: false, success: true, error: null });
        toast.success('Jira connection validated!');
      } else {
        setJiraTest({ loading: false, success: false, error: res.error });
      }
    } catch (err) {
      setJiraTest({ loading: false, success: false, error: err.response?.data?.error || err.message });
    }
  };

  const handleTestDiscord = async () => {
    if (!data.discord_guild_id || !data.discord_channel_id || !data.discord_bot_token) {
      setErrors(prev => ({
        ...prev,
        discord_guild_id: !data.discord_guild_id ? 'Required' : null,
        discord_channel_id: !data.discord_channel_id ? 'Required' : null,
        discord_bot_token: !data.discord_bot_token ? 'Required' : null,
      }));
      return;
    }
    setDiscordTest({ loading: true, success: null, error: null });
    try {
      const res = await projectService.testCredential('discord', {
        guildId: data.discord_guild_id,
        channelId: data.discord_channel_id,
        botToken: data.discord_bot_token,
      });
      if (res.valid) {
        setDiscordTest({ loading: false, success: true, error: null });
        toast.success('Discord connection validated!');
      } else {
        setDiscordTest({ loading: false, success: false, error: res.error });
      }
    } catch (err) {
      setDiscordTest({ loading: false, success: false, error: err.response?.data?.error || err.message });
    }
  };

  const validateStep = () => {
    const stepErrors = {};
    if (step === 1) {
      if (!data.project_name.trim()) stepErrors.project_name = 'Project Name is required';
      if (!data.project_end_date) stepErrors.project_end_date = 'Target Deadline is required';
      else if (new Date(data.project_end_date) <= new Date()) {
        stepErrors.project_end_date = 'Target Deadline must be a future date';
      }
    } else if (step === 2) {
      if (!data.github_owner.trim()) stepErrors.github_owner = 'Owner is required';
      if (!data.github_repo.trim()) stepErrors.github_repo = 'Repository is required';
      if (!data.github_token.trim()) stepErrors.github_token = 'Token is required';
    } else if (step === 3) {
      if (!data.jira_base_url.trim()) stepErrors.jira_base_url = 'Base URL is required';
      else if (!/^https?:\/\//.test(data.jira_base_url)) {
        stepErrors.jira_base_url = 'Must be a valid URL starting with http:// or https://';
      }
      if (!data.jira_project_key.trim()) stepErrors.jira_project_key = 'Project Key is required';
      if (!data.jira_email.trim()) stepErrors.jira_email = 'Email is required';
      if (!data.jira_api_token.trim()) stepErrors.jira_api_token = 'API Token is required';
    } else if (step === 4) {
      if (!data.discord_guild_id.trim()) stepErrors.discord_guild_id = 'Guild ID is required';
      if (!data.discord_channel_id.trim()) stepErrors.discord_channel_id = 'Channel ID is required';
      if (!data.discord_bot_token.trim()) stepErrors.discord_bot_token = 'Bot Token is required';
    }
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await projectService.create(data);
      toast.success(response.message || 'Project created successfully!');
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project. Please verify all integration settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator Header */}
      <div className="flex justify-between items-center bg-dark-900/60 p-4 border border-dark-800 rounded-2xl">
        {STEPS.map((s, idx) => (
          <React.Fragment key={s.id}>
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border transition-colors ${
                step === s.id 
                  ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-900/40' 
                  : step > s.id 
                    ? 'bg-primary-950/20 border-primary-600/50 text-primary-400' 
                    : 'bg-dark-900 border-dark-700 text-dark-400'
              }`}>
                {s.id}
              </span>
              <span className={`text-[10px] uppercase font-bold tracking-wider hidden lg:block ${
                step === s.id ? 'text-white' : step > s.id ? 'text-primary-400' : 'text-dark-400'
              }`}>
                {s.name}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <span className={`flex-1 h-px border-t border-dashed hidden lg:block mx-4 ${
                step > s.id ? 'border-primary-600/30' : 'border-dark-800'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Body */}
      <div className="card min-h-[300px] flex flex-col justify-between">
        <div>
          <h3 className="section-title mb-6">
            Step {step}: {STEPS[step - 1].name}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <BasicDetailsStep
                data={data}
                onChange={handleChange}
                errors={errors}
              />
            )}
            {step === 2 && (
              <GithubStep
                data={data}
                onChange={handleChange}
                errors={errors}
                testState={githubTest}
                onTest={handleTestGithub}
              />
            )}
            {step === 3 && (
              <JiraStep
                data={data}
                onChange={handleChange}
                errors={errors}
                testState={jiraTest}
                onTest={handleTestJira}
              />
            )}
            {step === 4 && (
              <DiscordStep
                data={data}
                onChange={handleChange}
                errors={errors}
                testState={discordTest}
                onTest={handleTestDiscord}
              />
            )}
            {step === 5 && (
              <ReviewStep
                data={data}
              />
            )}
          </form>
        </div>

        {/* Form Actions Footer */}
        <div className="flex justify-between items-center pt-6 mt-6 border-t border-dark-800/80">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || loading}
            className="btn-secondary px-5 py-2"
          >
            Back
          </button>
          
          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn-primary px-5 py-2"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30"
            >
              {loading ? 'Deploying Project...' : 'Launch Project'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
