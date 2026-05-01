require('dotenv').config();
const express = require('express');
const config = require('./config');
const syncDB = require('./db/sync');
const telemetryRouter = require('./routes/telemetryRouter');
const { initScheduler } = require('./scheduler');

const app = express();
app.use(express.json());

app.use('/api/telemetry', telemetryRouter);

async function startServer() {
  await syncDB();
  
  // Start scheduler after DB is ready
  initScheduler();
  
  app.listen(config.app.port, () => {
    console.log(`[Server] Sentinel-Telemetry running on port ${config.app.port}`);
  });
}

startServer();
