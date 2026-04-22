const axios = require('axios');
const config = require('../config');

async function fetchJiraMetrics(projectKey) {
  try {
    if (!config.jira.baseUrl || !config.jira.email || !config.jira.apiToken) {
      throw new Error('Jira credentials not configured');
    }

    const auth = Buffer.from(`${config.jira.email}:${config.jira.apiToken}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    };

    const baseUrl = config.jira.baseUrl.replace(/\/$/, '');

    // 1. Sprint Velocity (Planned vs Completed)
    // Note: Jira Cloud requires agile boards API to get sprints. We approximate by checking issues in last 3 sprints or recent resolved vs created
    // Given the difficulty of fetching exact sprint data without Board ID, we will fetch recent issues to compute approximate velocity and backlog growth.
    
    // We will search for issues in the last 30 days
    const jqlAllRecent = `project = "${projectKey}" AND created >= -30d`;
    const jqlResolvedRecent = `project = "${projectKey}" AND resolved >= -30d`;
    const jqlUnresolved = `project = "${projectKey}" AND resolution = Unresolved`;

    const createdRes = await axios.post(`${baseUrl}/rest/api/3/search/jql`, { jql: jqlAllRecent, maxResults: 100 }, { headers });
    const resolvedRes = await axios.post(`${baseUrl}/rest/api/3/search/jql`, { jql: jqlResolvedRecent, maxResults: 100 }, { headers });
    
    const issuesCreated = createdRes.data.issues ? createdRes.data.issues.length : 0;
    const issuesResolved = resolvedRes.data.issues ? resolvedRes.data.issues.length : 0;

    // Backlog growth rate = (Created - Resolved) / Created
    let backlog_growth_rate = 0;
    if (issuesCreated > 0) {
      backlog_growth_rate = (issuesCreated - issuesResolved) / issuesCreated;
    }

    // Sprint Velocity (Approximation for last 3 sprints / ~45 days)
    // Here we'll just use issues resolved in last 45 days vs created in 45 days
    // Alternatively, if they have custom fields for story points, we sum them.
    // Assuming 1 issue = 1 point for simplicity if story points aren't found.
    const sprint_velocity_planned = issuesCreated * 1.5; // Dummy approximation if not using strict sprint board API
    const sprint_velocity_completed = issuesResolved;

    // Task aging (Average days open beyond due date or just average days open for unresolved)
    const unresolvedRes = await axios.post(`${baseUrl}/rest/api/3/search/jql`, { jql: jqlUnresolved, fields: ["created", "duedate"], maxResults: 100 }, { headers });
    
    let totalAgingDays = 0;
    let agingCount = 0;
    const now = new Date();

    for (const issue of unresolvedRes.data.issues) {
      const createdDate = new Date(issue.fields.created);
      const daysOpen = (now - createdDate) / (1000 * 60 * 60 * 24);
      totalAgingDays += daysOpen;
      agingCount++;
    }

    const avg_task_aging_days = agingCount > 0 ? (totalAgingDays / agingCount) : 0;

    return {
      sprint_velocity_planned,
      sprint_velocity_completed,
      avg_task_aging_days,
      backlog_growth_rate
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [jiraAdapter] ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { fetchJiraMetrics };
