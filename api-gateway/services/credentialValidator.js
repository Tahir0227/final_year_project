/**
 * credentialValidator.js — Real API validation for GitHub, Jira, Discord credentials.
 *
 * All validators make live network calls and return { valid, error } objects.
 * validateAll() runs all three in parallel.
 */

'use strict';

const axios = require('axios');
const { Octokit } = require('@octokit/rest');

// ─── GitHub ───────────────────────────────────────────────────────────────────

/**
 * Validate GitHub credentials by fetching the repository.
 * @returns {{ valid: boolean, error: string|null, meta: object }}
 */
async function validateGitHub(owner, repo, token) {
  try {
    if (!owner || !repo || !token) {
      return { valid: false, error: 'GitHub owner, repo, and token are required' };
    }
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.repos.get({ owner, repo });
    return {
      valid: true,
      error: null,
      meta: {
        full_name: data.full_name,
        stars: data.stargazers_count,
        private: data.private,
        default_branch: data.default_branch
      }
    };
  } catch (err) {
    if (err.status === 404) return { valid: false, error: 'Repository not found. Check owner/repo name.' };
    if (err.status === 401) return { valid: false, error: 'Invalid GitHub token. Check your Personal Access Token.' };
    if (err.status === 403) return { valid: false, error: 'GitHub API rate limited or token lacks repo scope.' };
    return { valid: false, error: `GitHub error: ${err.message}` };
  }
}

// ─── Jira ─────────────────────────────────────────────────────────────────────

/**
 * Validate Jira credentials by calling /rest/api/3/myself and checking project key.
 * @returns {{ valid: boolean, error: string|null, meta: object }}
 */
async function validateJira(baseUrl, email, apiToken, projectKey) {
  try {
    if (!baseUrl || !email || !apiToken) {
      return { valid: false, error: 'Jira base URL, email, and API token are required' };
    }
    const cleanBase = baseUrl.replace(/\/$/, '');
    const authHeader = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const headers = { Authorization: `Basic ${authHeader}`, Accept: 'application/json' };

    // 1. Verify credentials
    const meRes = await axios.get(`${cleanBase}/rest/api/3/myself`, { headers, timeout: 10000 });
    const accountId = meRes.data.accountId;
    const displayName = meRes.data.displayName;

    // 2. Verify project key if provided
    let projectMeta = null;
    if (projectKey) {
      try {
        const projRes = await axios.get(`${cleanBase}/rest/api/3/project/${projectKey}`, { headers, timeout: 10000 });
        projectMeta = { key: projRes.data.key, name: projRes.data.name };
      } catch (projErr) {
        if (projErr.response?.status === 404) {
          return { valid: false, error: `Project key "${projectKey}" not found in this Jira workspace.` };
        }
        return { valid: false, error: `Could not verify project key: ${projErr.message}` };
      }
    }

    return {
      valid: true,
      error: null,
      meta: { accountId, displayName, email, project: projectMeta }
    };
  } catch (err) {
    if (err.response?.status === 401) return { valid: false, error: 'Invalid Jira credentials. Check email and API token.' };
    if (err.response?.status === 403) return { valid: false, error: 'Jira account does not have required permissions.' };
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      return { valid: false, error: 'Jira URL unreachable. Check your base URL (e.g. https://yourcompany.atlassian.net).' };
    }
    return { valid: false, error: `Jira error: ${err.message}` };
  }
}

// ─── Discord ──────────────────────────────────────────────────────────────────

/**
 * Validate Discord bot token by calling the Discord REST API.
 * Uses REST API directly (no gateway connection needed) for fast validation.
 * @returns {{ valid: boolean, error: string|null, meta: object }}
 */
async function validateDiscord(botToken, guildId, channelId) {
  try {
    if (!botToken || !guildId || !channelId) {
      return { valid: false, error: 'Discord bot token, guild ID, and channel ID are required' };
    }
    const headers = { Authorization: `Bot ${botToken}` };

    // 1. Verify bot token & get guild info
    let guildName = '';
    try {
      const guildRes = await axios.get(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers, timeout: 10000
      });
      guildName = guildRes.data.name;
    } catch (err) {
      if (err.response?.status === 401) return { valid: false, error: 'Invalid Discord bot token.' };
      if (err.response?.status === 403) return { valid: false, error: 'Bot is not in the specified server (guild).' };
      if (err.response?.status === 404) return { valid: false, error: 'Discord server (guild) not found. Check Guild ID.' };
      return { valid: false, error: `Discord guild error: ${err.response?.data?.message || err.message}` };
    }

    // 2. Verify channel access
    let channelName = '';
    try {
      const chanRes = await axios.get(`https://discord.com/api/v10/channels/${channelId}`, {
        headers, timeout: 10000
      });
      channelName = chanRes.data.name;
    } catch (err) {
      if (err.response?.status === 403) return { valid: false, error: 'Bot cannot access the specified channel. Check bot permissions.' };
      if (err.response?.status === 404) return { valid: false, error: 'Discord channel not found. Check Channel ID.' };
      return { valid: false, error: `Discord channel error: ${err.response?.data?.message || err.message}` };
    }

    return {
      valid: true,
      error: null,
      meta: { guildName, channelName, guildId, channelId }
    };
  } catch (err) {
    return { valid: false, error: `Discord error: ${err.message}` };
  }
}

// ─── Validate All ─────────────────────────────────────────────────────────────

/**
 * Run all three validations in parallel.
 * @returns {{ github, jira, discord, allValid: boolean }}
 */
async function validateAll({ githubOwner, githubRepo, githubToken, jiraBaseUrl, jiraEmail, jiraApiToken, jiraProjectKey, discordBotToken, discordGuildId, discordChannelId }) {
  const [ghRes, jiraRes, discRes] = await Promise.allSettled([
    validateGitHub(githubOwner, githubRepo, githubToken),
    validateJira(jiraBaseUrl, jiraEmail, jiraApiToken, jiraProjectKey),
    validateDiscord(discordBotToken, discordGuildId, discordChannelId)
  ]);

  const github = ghRes.status === 'fulfilled' ? ghRes.value : { valid: false, error: ghRes.reason?.message || 'Unknown error' };
  const jira   = jiraRes.status === 'fulfilled' ? jiraRes.value : { valid: false, error: jiraRes.reason?.message || 'Unknown error' };
  const discord = discRes.status === 'fulfilled' ? discRes.value : { valid: false, error: discRes.reason?.message || 'Unknown error' };

  return {
    github,
    jira,
    discord,
    allValid: github.valid && jira.valid && discord.valid
  };
}

module.exports = { validateGitHub, validateJira, validateDiscord, validateAll };
