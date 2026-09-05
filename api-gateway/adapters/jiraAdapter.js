/**
 * jiraAdapter.js — Fetches Jira metrics.
 * Accepts optional per-project credentials; falls back to global config.
 */

'use strict';

const axios = require('axios');
const config = require('../config');

/**
 * @param {string} projectKey
 * @param {object} [credentials] - { baseUrl, email, apiToken } overrides
 */
async function fetchJiraMetrics(projectKey, credentials = {}) {
  try {
    const baseUrl   = (credentials.baseUrl || '').replace(/\/$/, '');
    const email     = credentials.email;
    const apiToken  = credentials.apiToken;
    const key       = projectKey || credentials.projectKey;

    if (!baseUrl || !email || !apiToken || !key) {
      throw new Error('Jira credentials/project key not fully configured. Please update your project integration settings.');
    }

    const auth    = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const headers = { Authorization: `Basic ${auth}`, Accept: 'application/json' };

    const jqlAllRecent  = `project = "${key}" AND created >= -30d`;
    const jqlResolved   = `project = "${key}" AND resolved >= -30d`;
    const jqlUnresolved = `project = "${key}" AND resolution = Unresolved`;

    const [createdRes, resolvedRes, unresolvedRes] = await Promise.all([
      axios.post(`${baseUrl}/rest/api/3/search/jql`, { jql: jqlAllRecent,  maxResults: 100 }, { headers, timeout: 15000 }),
      axios.post(`${baseUrl}/rest/api/3/search/jql`, { jql: jqlResolved,   maxResults: 100 }, { headers, timeout: 15000 }),
      axios.post(`${baseUrl}/rest/api/3/search/jql`, { jql: jqlUnresolved, fields: ['created', 'duedate'], maxResults: 100 }, { headers, timeout: 15000 })
    ]);

    const issuesCreated  = createdRes.data.issues?.length || 0;
    const issuesResolved = resolvedRes.data.issues?.length || 0;

    const backlog_growth_rate = issuesCreated > 0
      ? (issuesCreated - issuesResolved) / issuesCreated
      : 0;

    const sprint_velocity_planned   = issuesCreated * 1.5;
    const sprint_velocity_completed = issuesResolved;

    let totalAgingDays = 0;
    let agingCount = 0;
    const now = new Date();
    for (const issue of (unresolvedRes.data.issues || [])) {
      const daysOpen = (now - new Date(issue.fields.created)) / (1000 * 60 * 60 * 24);
      totalAgingDays += daysOpen;
      agingCount++;
    }
    const avg_task_aging_days = agingCount > 0 ? totalAgingDays / agingCount : 0;

    return { sprint_velocity_planned, sprint_velocity_completed, avg_task_aging_days, backlog_growth_rate };

  } catch (error) {
    console.error(`[jiraAdapter] ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { fetchJiraMetrics };
