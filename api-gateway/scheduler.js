const cron = require('node-cron');
const config = require('./config');
const Project = require('./models/Project');
const { runTelemetryScan } = require('./services/telemetryService');

async function runAllScans() {
  console.log(`[${new Date().toISOString()}] [scheduler] Starting telemetry scans for all projects...`);
  try {
    const projects = await Project.findAll();
    if (projects.length === 0) {
      console.log(`[${new Date().toISOString()}] [scheduler] No projects found in DB to scan.`);
      return;
    }
    for (const project of projects) {
      console.log(`[${new Date().toISOString()}] [scheduler] Scanning project: ${project.project_id}`);
      await runTelemetryScan(project.project_id);
    }
    console.log(`[${new Date().toISOString()}] [scheduler] Completed telemetry scans.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [scheduler] Error during scheduled scans: ${error.message}`);
  }
}

function initScheduler() {
  // Schedule job every X minutes based on config
  cron.schedule(`*/${config.app.scanIntervalMinutes} * * * *`, runAllScans);
  console.log(`[scheduler] Telemetry cron job initialized. Interval: ${config.app.scanIntervalMinutes} minutes.`);
  
  // Run immediately on startup
  console.log(`[scheduler] Triggering initial telemetry scan on startup...`);
  runAllScans();
}

module.exports = { initScheduler, runAllScans };
