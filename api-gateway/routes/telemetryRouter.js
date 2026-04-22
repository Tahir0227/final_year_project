const express = require('express');
const router = express.Router();
const { runTelemetryScan } = require('../services/telemetryService');
const TelemetryScan = require('../models/TelemetryScan');
const GithubMetric = require('../models/GithubMetric');
const JiraMetric = require('../models/JiraMetric');
const DiscordMetric = require('../models/DiscordMetric');
const DiscordMessage = require('../models/DiscordMessage');
const { Op } = require('sequelize');

// POST /api/telemetry/collect
router.post('/collect', async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    const result = await runTelemetryScan(projectId);
    if (result.success === false) {
      return res.status(500).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [telemetryRouter] ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/telemetry/:projectId/latest
router.get('/:projectId/latest', async (req, res) => {
  try {
    const { projectId } = req.params;
    const latestScan = await TelemetryScan.findOne({
      where: { project_id: projectId },
      order: [['scanned_at', 'DESC']],
      include: [GithubMetric, JiraMetric, DiscordMetric]
    });

    if (!latestScan) {
      return res.status(404).json({ error: 'No scans found for this project' });
    }
    res.json(latestScan);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [telemetryRouter] ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/telemetry/:projectId/history?days=30
router.get('/:projectId/history', async (req, res) => {
  try {
    const { projectId } = req.params;
    const days = parseInt(req.query.days) || 30;
    
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const history = await TelemetryScan.findAll({
      where: {
        project_id: projectId,
        scanned_at: { [Op.gte]: dateLimit }
      },
      order: [['scanned_at', 'DESC']],
      include: [GithubMetric, JiraMetric, DiscordMetric]
    });

    res.json(history);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [telemetryRouter] ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/telemetry/:projectId/messages?scan_id=X
router.get('/:projectId/messages', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { scan_id } = req.query;

    if (!scan_id) {
      return res.status(400).json({ error: 'scan_id query parameter is required' });
    }

    const scan = await TelemetryScan.findOne({ where: { scan_id, project_id: projectId } });
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found for this project' });
    }

    const messages = await DiscordMessage.findAll({
      where: { scan_id },
      order: [['sent_at', 'DESC']]
    });

    res.json(messages);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [telemetryRouter] ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
