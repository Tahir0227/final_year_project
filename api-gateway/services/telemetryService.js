/**
 * telemetryService.js — Telemetry pipeline coordinator.
 * Updated to accept per-project credentials (pass-through to adapters).
 * Falls back to global config when credentials are not provided.
 */

'use strict';

const Project        = require('../models/Project');
const TelemetryScan  = require('../models/TelemetryScan');
const GithubMetric   = require('../models/GithubMetric');
const JiraMetric     = require('../models/JiraMetric');
const DiscordMetric  = require('../models/DiscordMetric');
const DiscordMessage = require('../models/DiscordMessage');

const { fetchGithubMetrics }  = require('../adapters/githubAdapter');
const { fetchJiraMetrics }    = require('../adapters/jiraAdapter');
const { fetchDiscordMetrics } = require('../adapters/discordAdapter');

/**
 * Run a full telemetry scan for a project.
 *
 * @param {string} projectId
 * @param {object} [credentials] - Decrypted per-project credentials:
 *   { github: { token, owner, repo }, jira: { baseUrl, email, apiToken, projectKey },
 *     discord: { botToken, guildId, channelId } }
 *   Falls back to project fields from DB + global config if omitted.
 */
async function runTelemetryScan(projectId, credentials = {}) {
  try {
    const project = await Project.findByPk(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    // 1. Create TelemetryScan row
    const scan = await TelemetryScan.create({ project_id: projectId, status: 'partial' });

    // 2. Resolve adapter arguments — auto-decrypt from DB if omitted
    const { decrypt } = require('./encryptionService');

    const ghToken = credentials.github?.token || (project.github_token_enc ? decrypt(project.github_token_enc) : null);
    const ghOwner = credentials.github?.owner || project.github_owner;
    const ghRepo  = credentials.github?.repo  || project.github_repo;
    const ghCreds = { token: ghToken, owner: ghOwner, repo: ghRepo };

    const jiraBaseUrl  = credentials.jira?.baseUrl  || project.jira_base_url;
    const jiraEmail    = credentials.jira?.email    || project.jira_email;
    const jiraApiToken = credentials.jira?.apiToken || (project.jira_api_token_enc ? decrypt(project.jira_api_token_enc) : null);
    const jiraKey      = credentials.jira?.projectKey || project.jira_project_key;
    const jiraCreds    = { baseUrl: jiraBaseUrl, email: jiraEmail, apiToken: jiraApiToken, projectKey: jiraKey };

    const discBotToken  = credentials.discord?.botToken  || (project.discord_bot_token_enc ? decrypt(project.discord_bot_token_enc) : null);
    const discGuildId   = credentials.discord?.guildId   || project.discord_guild_id;
    const discChanId    = credentials.discord?.channelId || project.discord_channel_id;
    const discCreds     = { botToken: discBotToken, guildId: discGuildId, channelId: discChanId };

    // 3. Run adapters concurrently
    const promises = [
      ghOwner && ghRepo && ghToken
        ? fetchGithubMetrics(ghOwner, ghRepo, ghCreds)
        : Promise.resolve({ success: false, error: 'GitHub credentials/repo not configured. Please update project integration settings.' }),
      jiraBaseUrl && jiraEmail && jiraApiToken && jiraKey
        ? fetchJiraMetrics(jiraKey, jiraCreds)
        : Promise.resolve({ success: false, error: 'Jira credentials/project key not fully configured. Please update project integration settings.' }),
      discBotToken && discChanId
        ? fetchDiscordMetrics(discGuildId, discChanId, discCreds)
        : Promise.resolve({ success: false, error: 'Discord bot token/channel ID not configured. Please update project integration settings.' })
    ];

    const [ghResult, jiraResult, discResult] = await Promise.allSettled(promises);
    let successCount = 0;

    // Check adapter credential errors to save directly to database
    let githubError = null;
    if (ghResult.status === 'rejected') {
      githubError = ghResult.reason?.message || 'GitHub connection failed';
    } else if (ghResult.value && ghResult.value.success === false) {
      githubError = ghResult.value.error || 'GitHub connection failed';
    } else if (ghResult.value && ghResult.value.error) {
      githubError = ghResult.value.error;
    }

    let jiraError = null;
    if (jiraResult.status === 'rejected') {
      jiraError = jiraResult.reason?.message || 'Jira connection failed';
    } else if (jiraResult.value && jiraResult.value.success === false) {
      jiraError = jiraResult.value.error || 'Jira connection failed';
    } else if (jiraResult.value && jiraResult.value.error) {
      jiraError = jiraResult.value.error;
    }

    let discordError = null;
    if (discResult.status === 'rejected') {
      discordError = discResult.reason?.message || 'Discord connection failed';
    } else if (discResult.value && discResult.value.success === false) {
      discordError = discResult.value.error || 'Discord connection failed';
    } else if (discResult.value && discResult.value.error) {
      discordError = discResult.value.error;
    }

    // Save error statuses to the project row
    await project.update({
      github_error: githubError,
      jira_error: jiraError,
      discord_error: discordError
    });

    // 4. Insert GitHub Metrics
    if (ghResult.status === 'fulfilled' && ghResult.value && ghResult.value.success !== false) {
      try {
        await GithubMetric.create({ scan_id: scan.scan_id, ...ghResult.value });
        successCount++;
      } catch (err) {
        console.error(`[telemetryService] GitHub insert error: ${err.message}`);
      }
    }

    // 5. Insert Jira Metrics
    if (jiraResult.status === 'fulfilled' && jiraResult.value && jiraResult.value.success !== false) {
      try {
        await JiraMetric.create({ scan_id: scan.scan_id, ...jiraResult.value });
        successCount++;
      } catch (err) {
        console.error(`[telemetryService] Jira insert error: ${err.message}`);
      }
    }

    // 6. Insert Discord Metrics & Messages
    if (discResult.status === 'fulfilled' && discResult.value && discResult.value.success !== false) {
      try {
        const { metrics, messages } = discResult.value;
        await DiscordMetric.create({ scan_id: scan.scan_id, ...metrics });
        if (messages && messages.length > 0) {
          const msgsToInsert = messages.map(m => ({ scan_id: scan.scan_id, ...m }));
          await DiscordMessage.bulkCreate(msgsToInsert, { ignoreDuplicates: true });
        }
        successCount++;
      } catch (err) {
        console.error(`[telemetryService] Discord insert error: ${err.message}`);
      }
    }

    // 7. Update scan status
    const finalStatus = successCount === 3 ? 'complete' : successCount > 0 ? 'partial' : 'failed';
    await scan.update({ status: finalStatus });

    return { scan_id: scan.scan_id, status: finalStatus };

  } catch (error) {
    console.error(`[telemetryService] Main error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { runTelemetryScan };
