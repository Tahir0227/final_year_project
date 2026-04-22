const cron = require('node-cron');
const config = require('./config');
const Project = require('./models/Project');
const { runTelemetryScan } = require('./services/telemetryService');

// Schedule job every X minutes based on config
cron.schedule(`*/${config.app.scanIntervalMinutes} * * * *`, async () => {
  console.log(`[${new Date().toISOString()}] [scheduler] Starting telemetry scans for all projects...`);
  try {
    const projects = await Project.findAll();
    for (const project of projects) {
      console.log(`[${new Date().toISOString()}] [scheduler] Scanning project: ${project.project_id}`);
      await runTelemetryScan(project.project_id);
    }
    console.log(`[${new Date().toISOString()}] [scheduler] Completed telemetry scans.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [scheduler] Error during scheduled scans: ${error.message}`);
  }
});

console.log(`[scheduler] Telemetry cron job initialized. Interval: ${config.app.scanIntervalMinutes} minutes.`);
