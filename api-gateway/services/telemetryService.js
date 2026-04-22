const Project = require('../models/Project');
const TelemetryScan = require('../models/TelemetryScan');
const GithubMetric = require('../models/GithubMetric');
const JiraMetric = require('../models/JiraMetric');
const DiscordMetric = require('../models/DiscordMetric');
const DiscordMessage = require('../models/DiscordMessage');

const { fetchGithubMetrics } = require('../adapters/githubAdapter');
const { fetchJiraMetrics } = require('../adapters/jiraAdapter');
const { fetchDiscordMetrics } = require('../adapters/discordAdapter');

async function runTelemetryScan(projectId) {
  try {
    const project = await Project.findByPk(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // 1. Create TelemetryScan row
    const scan = await TelemetryScan.create({
      project_id: projectId,
      status: 'partial' // Temporary
    });

    // 2. Run adapters
    const promises = [];
    
    // GitHub
    const githubPromise = project.github_owner && project.github_repo
      ? fetchGithubMetrics(project.github_owner, project.github_repo)
      : Promise.resolve({ success: false, error: 'GitHub info missing' });
    promises.push(githubPromise);

    // Jira
    const jiraPromise = project.jira_project_key
      ? fetchJiraMetrics(project.jira_project_key)
      : Promise.resolve({ success: false, error: 'Jira info missing' });
    promises.push(jiraPromise);

    // Discord
    const discordPromise = project.discord_channel_id
      ? fetchDiscordMetrics(null, project.discord_channel_id)
      : Promise.resolve({ success: false, error: 'Discord info missing' });
    promises.push(discordPromise);

    const [ghResult, jiraResult, discResult] = await Promise.allSettled(promises);

    let successCount = 0;

    // 3. Insert GitHub Metrics
    if (ghResult.status === 'fulfilled' && ghResult.value && ghResult.value.success !== false) {
      try {
        await GithubMetric.create({
          scan_id: scan.scan_id,
          ...ghResult.value
        });
        successCount++;
      } catch (err) {
        console.error(`[${new Date().toISOString()}] [telemetryService] GitHub insert error: ${err.message}`);
      }
    }

    // 4. Insert Jira Metrics
    if (jiraResult.status === 'fulfilled' && jiraResult.value && jiraResult.value.success !== false) {
      try {
        await JiraMetric.create({
          scan_id: scan.scan_id,
          ...jiraResult.value
        });
        successCount++;
      } catch (err) {
        console.error(`[${new Date().toISOString()}] [telemetryService] Jira insert error: ${err.message}`);
      }
    }

    // 5. Insert Discord Metrics & Messages
    if (discResult.status === 'fulfilled' && discResult.value && discResult.value.success !== false) {
      try {
        const { metrics, messages } = discResult.value;
        await DiscordMetric.create({
          scan_id: scan.scan_id,
          ...metrics
        });
        
        if (messages && messages.length > 0) {
          const msgsToInsert = messages.map(m => ({
            scan_id: scan.scan_id,
            ...m
          }));
          await DiscordMessage.bulkCreate(msgsToInsert, { ignoreDuplicates: true });
        }
        successCount++;
      } catch (err) {
        console.error(`[${new Date().toISOString()}] [telemetryService] Discord insert error: ${err.message}`);
      }
    }

    // 6. Update Status
    let finalStatus = 'failed';
    if (successCount === 3) finalStatus = 'complete';
    else if (successCount > 0) finalStatus = 'partial';

    await scan.update({ status: finalStatus });

    return { scan_id: scan.scan_id, status: finalStatus };

  } catch (error) {
    console.error(`[${new Date().toISOString()}] [telemetryService] Main error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { runTelemetryScan };
