/**
 * pipelineOrchestrator.js — Central pipeline runner for the full
 * Telemetry → ML Inference → Prescription workflow.
 *
 * Called by:
 *   - projectRouter.js (on project create, rescan)
 *   - autoScanScheduler.js (hourly cron)
 */

'use strict';

const axios = require('axios');
const { decrypt } = require('./encryptionService');
const { runTelemetryScan } = require('./telemetryService');

const ML_URL         = process.env.ML_INFERENCE_URL || 'http://localhost:8000';
const PRESC_URL      = process.env.PRESCRIPTION_SERVICE_URL || 'http://localhost:8001';
const PIPELINE_TIMEOUT = 120000; // 2 min per external service call

/**
 * Build decrypted credentials object from a project DB row.
 */
function decryptProjectCredentials(project) {
  return {
    github: {
      token:  decrypt(project.github_token_enc),
      owner:  project.github_owner,
      repo:   project.github_repo
    },
    jira: {
      baseUrl:   project.jira_base_url,
      email:     project.jira_email,
      apiToken:  decrypt(project.jira_api_token_enc),
      projectKey: project.jira_project_key
    },
    discord: {
      botToken:  decrypt(project.discord_bot_token_enc),
      guildId:   project.discord_guild_id,
      channelId: project.discord_channel_id
    }
  };
}

/**
 * Determine notification type from health label and severity.
 */
function getNotificationType(healthLabel, severity) {
  if (healthLabel !== 'AT_RISK') return 'SCAN_COMPLETE';
  const sev = (severity || '').toUpperCase();
  if (sev === 'CRITICAL') return 'CRITICAL_ALERT';
  if (sev === 'HIGH')     return 'HIGH_ALERT';
  return 'MEDIUM_ALERT';
}

/**
 * runFullPipeline — Runs complete telemetry → ML → prescription pipeline.
 *
 * @param {string} projectId
 * @param {object} project       - Full project Sequelize row (with encrypted fields)
 * @param {string} triggeredBy   - 'AUTO' | 'MANUAL' | 'RESCAN'
 * @param {object} Notification  - Sequelize model for inserting notifications
 * @param {object} ScanSchedule  - Sequelize model for logging schedule rows
 *
 * @returns {{ scan_id, inference_id, prescription_id, health_label, stability_score, severity }}
 */
async function runFullPipeline(projectId, project, triggeredBy = 'AUTO', Notification, ScanSchedule) {
  const startedAt = new Date();
  let scheduleRow = null;

  try {
    // Step 0: Log scan schedule row
    if (ScanSchedule) {
      scheduleRow = await ScanSchedule.create({
        project_id: projectId,
        user_id: project.user_id,
        scheduled_at: startedAt,
        triggered_by: triggeredBy,
        status: 'RUNNING',
        started_at: startedAt
      });
    }

    // Step 1: Decrypt credentials
    const creds = decryptProjectCredentials(project);

    // Step 2: Run telemetry collection
    const telemetryResult = await runTelemetryScan(projectId, creds);
    if (!telemetryResult || !telemetryResult.scan_id) {
      throw new Error('Telemetry scan returned no scan_id');
    }
    const { scan_id } = telemetryResult;

    // Check if the scan failed or has credential errors
    await project.reload();
    if (project.github_error && project.jira_error && project.discord_error) {
      throw new Error('Telemetry collection failed completely. All configured integrations failed due to invalid credentials. Please update integration settings.');
    }
    if (project.github_error || project.jira_error || project.discord_error) {
      console.warn(`[Pipeline] Warning for project ${projectId}: Some integration credentials had errors (GitHub: ${project.github_error || 'OK'}, Jira: ${project.jira_error || 'OK'}, Discord: ${project.discord_error || 'OK'}). Proceeding with available telemetry.`);
    }

    // Step 3: ML Inference
    const inferRes = await axios.post(
      `${ML_URL}/api/infer`,
      { project_id: projectId, scan_id },
      { timeout: PIPELINE_TIMEOUT }
    );
    const infer = inferRes.data;

    const healthLabel     = infer.health_label || 'HEALTHY';
    const stabilityScore  = infer.stability_score || 100;
    const anomalyDetected = infer.anomaly_detected || false;

    // Step 4: Prescription (grab from response if generated)
    let prescriptionId = null;
    let severity = null;
    if (infer.prescription) {
      prescriptionId = infer.prescription.prescription_id || null;
      severity       = infer.prescription.severity || 'LOW';
    }

    // Step 5: Insert notification
    if (Notification && project.user_id) {
      const notifType = getNotificationType(healthLabel, severity);
      const title = healthLabel === 'AT_RISK'
        ? `⚠ ${project.project_name || projectId} is AT_RISK (${severity || 'MEDIUM'})`
        : `✅ ${project.project_name || projectId} scan complete — HEALTHY`;
      const message = healthLabel === 'AT_RISK'
        ? `Stability score: ${stabilityScore}/100. ${infer.top_risk_drivers?.[0]?.interpretation || 'Check prescriptions for details.'}`
        : `Stability score: ${stabilityScore}/100. No critical issues detected.`;

      await Notification.create({
        user_id: project.user_id,
        project_id: projectId,
        type: notifType,
        title,
        message
      }).catch(err => console.error('[Pipeline] Notification insert error:', err.message));
    }

    // Step 6: Check project end date → deadline notifications
    if (Notification && project.project_end_date && project.user_id) {
      const today = new Date();
      const endDate = new Date(project.project_end_date);
      const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 0) {
        // Mark project ended
        await project.update({ is_active: false }).catch(() => {});
        await Notification.create({
          user_id: project.user_id,
          project_id: projectId,
          type: 'PROJECT_ENDED',
          title: `📅 ${project.project_name || projectId} has ended`,
          message: `The project deadline was ${endDate.toDateString()}. Project has been marked as ended.`
        }).catch(() => {});
      } else if (daysRemaining <= 7) {
        // Only insert once per day — check last notification
        await Notification.create({
          user_id: project.user_id,
          project_id: projectId,
          type: 'PROJECT_ENDING_SOON',
          title: `⏰ ${project.project_name || projectId} ending in ${daysRemaining} day(s)`,
          message: `Deadline: ${endDate.toDateString()}. ${daysRemaining} day(s) remaining.`
        }).catch(() => {});
      }
    }

    // Step 7: Update scan schedule
    if (scheduleRow) {
      await scheduleRow.update({
        status: 'COMPLETE',
        completed_at: new Date()
      }).catch(() => {});
    }

    console.log(`[Pipeline] ${triggeredBy} | Project: ${projectId} | Health: ${healthLabel} | Stability: ${stabilityScore}`);

    return {
      scan_id,
      inference_id: infer.inference_id || null,
      prescription_id: prescriptionId,
      health_label: healthLabel,
      stability_score: stabilityScore,
      anomaly_detected: anomalyDetected,
      severity,
      top_risk_drivers: infer.top_risk_drivers || []
    };

  } catch (err) {
    console.error(`[Pipeline] ERROR | Project: ${projectId} | ${err.message}`);

    if (scheduleRow) {
      await scheduleRow.update({ status: 'FAILED', completed_at: new Date() }).catch(() => {});
    }

    if (Notification && project.user_id) {
      await Notification.create({
        user_id: project.user_id,
        project_id: projectId,
        type: 'SCAN_FAILED',
        title: `❌ Scan failed for ${project.project_name || projectId}`,
        message: err.message || 'Unknown pipeline error'
      }).catch(() => {});
    }

    throw err;
  }
}

module.exports = { runFullPipeline, decryptProjectCredentials };
