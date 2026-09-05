/**
 * autoScanScheduler.js — Hourly cron job that finds projects due for auto-scan
 * and runs the full telemetry → ML → prescription pipeline.
 *
 * Runs every hour: checks projects where next_scheduled_scan <= NOW().
 * All due projects are processed in parallel with Promise.allSettled().
 */

'use strict';

const cron = require('node-cron');
const { Op } = require('sequelize');
const { runFullPipeline } = require('./pipelineOrchestrator');

let Project, Notification, ScanSchedule;

function initModels() {
  // Lazy-load to avoid circular require issues at startup
  if (!Project) {
    Project      = require('../models/Project');
    Notification = require('../models/Notification');
    ScanSchedule = require('../models/ScanSchedule');
  }
}

/**
 * Process one project's scheduled scan.
 */
async function processDueScan(project) {
  try {
    console.log(`[AUTO-SCAN] Starting scan for project: ${project.project_id}`);

    const result = await runFullPipeline(
      project.project_id,
      project,
      'AUTO',
      Notification,
      ScanSchedule
    );

    // Update scan timestamps
    const now = new Date();
    const nextScan = new Date(now.getTime() + (project.scan_interval_minutes || 1440) * 60 * 1000);

    await project.update({
      last_auto_scan: now,
      next_scheduled_scan: nextScan
    });

    console.log(
      `[AUTO-SCAN] Project: ${project.project_id} | Status: complete | ` +
      `Health: ${result.health_label} | Stability: ${result.stability_score}`
    );

  } catch (err) {
    console.error(`[AUTO-SCAN] Project: ${project.project_id} | FAILED: ${err.message}`);
  }
}

/**
 * Find and process all projects due for auto-scan.
 */
async function runDueScans() {
  initModels();

  try {
    const now = new Date();
    const dueProjects = await Project.findAll({
      where: {
        is_active: true,
        next_scheduled_scan: { [Op.lte]: now }
      }
    });

    if (dueProjects.length === 0) {
      return;
    }

    console.log(`[AUTO-SCAN] Found ${dueProjects.length} project(s) due for scan`);

    // Run all in parallel — one failure never blocks others
    await Promise.allSettled(dueProjects.map(p => processDueScan(p)));

  } catch (err) {
    console.error(`[AUTO-SCAN] Scheduler error: ${err.message}`);
  }
}

/**
 * Initialize the auto-scan scheduler.
 * Runs every hour on the hour.
 */
function initAutoScanScheduler() {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log(`[AUTO-SCAN] Hourly check at ${new Date().toISOString()}`);
    await runDueScans();
  });

  // Also run once on startup after a short delay (let DB connect first)
  setTimeout(async () => {
    console.log('[AUTO-SCAN] Initial due-scan check on startup...');
    await runDueScans();
  }, 5000);

  console.log('[AUTO-SCAN] Scheduler initialized — runs every hour');
}

module.exports = { initAutoScanScheduler, runDueScans };
