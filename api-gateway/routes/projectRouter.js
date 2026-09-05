'use strict';

const express  = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op }   = require('sequelize');
const sequelize = require('../db/connection');

const authMiddleware   = require('../middleware/authMiddleware');
const { encrypt, maskToken } = require('../services/encryptionService');
const { validateAll, validateGitHub, validateJira, validateDiscord } = require('../services/credentialValidator');
const { runFullPipeline } = require('../services/pipelineOrchestrator');

const Project      = require('../models/Project');
const TelemetryScan = require('../models/TelemetryScan');
const GithubMetric  = require('../models/GithubMetric');
const JiraMetric    = require('../models/JiraMetric');
const DiscordMetric = require('../models/DiscordMetric');
const Notification  = require('../models/Notification');
const ScanSchedule  = require('../models/ScanSchedule');

const router = express.Router();

// All project routes require auth
router.use(authMiddleware);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(str) {
  return (str || 'project').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
}

function maskProject(project) {
  const obj = project.toJSON ? project.toJSON() : { ...project };
  if (obj.github_token_enc) obj.github_token_masked = maskToken('ghp_****'); // never expose enc
  if (obj.jira_api_token_enc) obj.jira_token_masked = maskToken('jira_****');
  if (obj.discord_bot_token_enc) obj.discord_token_masked = maskToken('MTQ_****');
  delete obj.github_token_enc;
  delete obj.jira_api_token_enc;
  delete obj.discord_bot_token_enc;
  return obj;
}

function computeDaysRemaining(project_end_date) {
  if (!project_end_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(project_end_date);
  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
}

// ─── POST /api/projects — Create ─────────────────────────────────────────────
router.post('/',
  [
    body('project_name').trim().notEmpty().withMessage('Project name required').isLength({ max: 100 }),
    body('project_end_date').isISO8601().withMessage('Valid project end date required')
      .custom(v => { if (new Date(v) <= new Date()) throw new Error('End date must be in the future'); return true; }),
    body('github_owner').trim().notEmpty().withMessage('GitHub owner required'),
    body('github_repo').trim().notEmpty().withMessage('GitHub repo required'),
    body('github_token').trim().notEmpty().withMessage('GitHub token required'),
    body('jira_base_url').trim().isURL().withMessage('Valid Jira base URL required'),
    body('jira_email').trim().isEmail().withMessage('Valid Jira email required'),
    body('jira_api_token').trim().notEmpty().withMessage('Jira API token required'),
    body('jira_project_key').trim().notEmpty().withMessage('Jira project key required'),
    body('discord_bot_token').trim().notEmpty().withMessage('Discord bot token required'),
    body('discord_guild_id').trim().notEmpty().withMessage('Discord guild ID required'),
    body('discord_channel_id').trim().notEmpty().withMessage('Discord channel ID required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      project_name, description, project_end_date, scan_interval_minutes = 1440,
      github_owner, github_repo, github_token,
      jira_base_url, jira_email, jira_api_token, jira_project_key,
      discord_bot_token, discord_guild_id, discord_channel_id
    } = req.body;

    try {
      // 1. Validate credentials
      const validation = await validateAll({
        githubOwner: github_owner, githubRepo: github_repo, githubToken: github_token,
        jiraBaseUrl: jira_base_url, jiraEmail: jira_email, jiraApiToken: jira_api_token, jiraProjectKey: jira_project_key,
        discordBotToken: discord_bot_token, discordGuildId: discord_guild_id, discordChannelId: discord_channel_id
      });

      if (!validation.allValid) {
        return res.status(400).json({
          error: 'Credential validation failed',
          details: {
            github:  validation.github,
            jira:    validation.jira,
            discord: validation.discord
          }
        });
      }

      // 2. Generate project_id
      const project_id = `${slugify(project_name)}-${req.user.id}-${Date.now()}`;

      // 3. Encrypt tokens
      const github_token_enc       = encrypt(github_token);
      const jira_api_token_enc     = encrypt(jira_api_token);
      const discord_bot_token_enc  = encrypt(discord_bot_token);

      // 4. Calculate next scan
      const now = new Date();
      const next_scheduled_scan = new Date(now.getTime() + Number(scan_interval_minutes) * 60 * 1000);

      // 5. Save project
      const project = await Project.create({
        project_id, user_id: req.user.id, project_name, name: project_name,
        description, project_end_date,
        github_owner, github_repo, github_token_enc,
        jira_base_url, jira_email, jira_api_token_enc, jira_project_key,
        discord_bot_token_enc, discord_guild_id, discord_channel_id,
        scan_interval_minutes: Number(scan_interval_minutes),
        next_scheduled_scan, is_active: true,
        github_error: null, jira_error: null, discord_error: null
      });

      // 6. Run first scan as background task
      setImmediate(async () => {
        try {
          await runFullPipeline(project_id, project, 'MANUAL', Notification, ScanSchedule);
        } catch (err) {
          console.error('[ProjectRouter] Initial scan error:', err.message);
        }
      });

      return res.status(201).json({
        message: 'Project created. First scan started in background.',
        project: maskProject(project)
      });

    } catch (err) {
      console.error('[ProjectRouter] Create error:', err.message);
      return res.status(500).json({ error: 'Failed to create project', detail: err.message });
    }
  }
);

// ─── POST /api/projects/test-credential — Test single credential ──────────────
router.post('/test-credential', async (req, res) => {
  const { type, project_id, ...data } = req.body;
  try {
    let decryptedToken = null;
    if (project_id) {
      const project = await Project.findOne({ where: { project_id, user_id: req.user.id } });
      if (project) {
        const { decrypt } = require('../services/encryptionService');
        if (type === 'github') decryptedToken = decrypt(project.github_token_enc);
        if (type === 'jira') decryptedToken = decrypt(project.jira_api_token_enc);
        if (type === 'discord') decryptedToken = decrypt(project.discord_bot_token_enc);
      }
    }

    let result;
    if (type === 'github') {
      const tokenToTest = data.token && data.token !== 'VALID_MOCK_EXISTING' && !data.token.includes('****') ? data.token : decryptedToken;
      result = await validateGitHub(data.owner, data.repo, tokenToTest);
    } else if (type === 'jira') {
      const tokenToTest = data.apiToken && !data.apiToken.includes('****') ? data.apiToken : decryptedToken;
      result = await validateJira(data.baseUrl, data.email, tokenToTest, data.projectKey);
    } else if (type === 'discord') {
      const tokenToTest = data.botToken && !data.botToken.includes('****') ? data.botToken : decryptedToken;
      result = await validateDiscord(tokenToTest, data.guildId, data.channelId);
    } else {
      return res.status(400).json({ error: 'Invalid type. Use github, jira, or discord.' });
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ valid: false, error: err.message });
  }
});

// ─── GET /api/projects — List all user projects ───────────────────────────────
router.get('/', async (req, res) => {
  try {
    const projects = await Project.findAll({ where: { user_id: req.user.id, is_active: true } });

    const enriched = await Promise.all(projects.map(async (p) => {
      // Get latest scan & inference via raw query for performance
      const [rows] = await sequelize.query(`
        SELECT ts.scan_id, ts.status as scan_status, ts.scanned_at,
               ir.health_label, ir.stability_score, ir.anomaly_detected,
               ir.shap_driver_1_feature, ir.shap_driver_1_interpretation
        FROM telemetry_scans ts
        LEFT JOIN inference_results ir ON ir.scan_id = ts.scan_id
        WHERE ts.project_id = :pid
        ORDER BY ts.scanned_at DESC LIMIT 1
      `, { replacements: { pid: p.project_id } });

      const latest = rows[0] || {};
      const days_remaining = computeDaysRemaining(p.project_end_date);
      const hasCredentialsError = !!(p.github_error || p.jira_error || p.discord_error);

      return {
        ...maskProject(p),
        latest_scan_status:  hasCredentialsError ? 'failed' : (latest.scan_status || null),
        latest_health_label: hasCredentialsError ? null : (latest.health_label || null),
        latest_stability_score: hasCredentialsError ? null : (latest.stability_score || null),
        last_scanned_at: latest.scanned_at || null,
        top_risk_driver: hasCredentialsError ? 'Configuration issue detected' : (latest.shap_driver_1_interpretation || null),
        days_remaining,
        is_deadline_soon: days_remaining !== null && days_remaining <= 7 && days_remaining > 0
      };
    }));

    return res.json(enriched);
  } catch (err) {
    console.error('[ProjectRouter] List error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// ─── GET /api/projects/:project_id — Project detail ──────────────────────────
router.get('/:project_id', async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { project_id: req.params.project_id, user_id: req.user.id }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Latest telemetry
    const [latestScanRows] = await sequelize.query(`
      SELECT ts.*, 
             gm.commit_frequency, gm.code_churn, gm.pr_cycle_time_hours, gm.top_contributor, gm.contributor_count,
             jm.sprint_velocity_planned, jm.sprint_velocity_completed, jm.avg_task_aging_days, jm.backlog_growth_rate,
             dm.messages_per_day, dm.active_users
      FROM telemetry_scans ts
      LEFT JOIN github_metrics  gm ON gm.scan_id = ts.scan_id
      LEFT JOIN jira_metrics    jm ON jm.scan_id = ts.scan_id
      LEFT JOIN discord_metrics dm ON dm.scan_id = ts.scan_id
      WHERE ts.project_id = :pid
      ORDER BY ts.scanned_at DESC LIMIT 1
    `, { replacements: { pid: project.project_id } });

    // Latest inference
    const [inferRows] = await sequelize.query(`
      SELECT * FROM inference_results WHERE project_id = :pid ORDER BY inferred_at DESC LIMIT 1
    `, { replacements: { pid: project.project_id } });

    // Latest prescription
    const [prescRows] = await sequelize.query(`
      SELECT * FROM prescriptions WHERE project_id = :pid ORDER BY generated_at DESC LIMIT 1
    `, { replacements: { pid: project.project_id } });

    // Health history (last 30)
    const [historyRows] = await sequelize.query(`
      SELECT ts.scanned_at, ir.stability_score, ir.health_label
      FROM telemetry_scans ts
      LEFT JOIN inference_results ir ON ir.scan_id = ts.scan_id
      WHERE ts.project_id = :pid AND ir.health_label IS NOT NULL
      ORDER BY ts.scanned_at DESC LIMIT 30
    `, { replacements: { pid: project.project_id } });

    const days_remaining = computeDaysRemaining(project.project_end_date);
    const hasCredentialsError = !!(project.github_error || project.jira_error || project.discord_error);

    return res.json({
      project: maskProject(project),
      latest_scan: latestScanRows[0] || null,
      latest_inference: hasCredentialsError ? null : (inferRows[0] || null),
      latest_prescription: hasCredentialsError ? null : (prescRows[0] || null),
      health_history: hasCredentialsError ? [] : historyRows.reverse(),
      days_remaining,
      is_deadline_soon: days_remaining !== null && days_remaining <= 7 && days_remaining > 0
    });
  } catch (err) {
    console.error('[ProjectRouter] Detail error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch project detail' });
  }
});

// ─── PUT /api/projects/:project_id — Update ───────────────────────────────────
router.put('/:project_id', async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { project_id: req.params.project_id, user_id: req.user.id }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const {
      project_name, description, project_end_date, scan_interval_minutes,
      github_owner, github_repo, github_token,
      jira_base_url, jira_email, jira_api_token, jira_project_key,
      discord_bot_token, discord_guild_id, discord_channel_id
    } = req.body;

    // 1. Get decrypted current values for validation fallback
    const { decrypt } = require('../services/encryptionService');
    const currentGithubToken = project.github_token_enc ? decrypt(project.github_token_enc) : '';
    const currentJiraToken   = project.jira_api_token_enc ? decrypt(project.jira_api_token_enc) : '';
    const currentDiscordToken = project.discord_bot_token_enc ? decrypt(project.discord_bot_token_enc) : '';

    // 2. Resolve fields to validate
    const githubOwner  = github_owner  !== undefined ? github_owner  : project.github_owner;
    const githubRepo   = github_repo   !== undefined ? github_repo   : project.github_repo;
    const githubToken  = github_token  ? github_token  : currentGithubToken;

    const jiraBaseUrl  = jira_base_url !== undefined ? jira_base_url : project.jira_base_url;
    const jiraEmail    = jira_email    !== undefined ? jira_email    : project.jira_email;
    const jiraApiToken = jira_api_token ? jira_api_token : currentJiraToken;
    const jiraProjectKey = jira_project_key !== undefined ? jira_project_key : project.jira_project_key;

    const discordBotToken  = discord_bot_token  ? discord_bot_token  : currentDiscordToken;
    const discordGuildId   = discord_guild_id   !== undefined ? discord_guild_id   : project.discord_guild_id;
    const discordChannelId = discord_channel_id !== undefined ? discord_channel_id : project.discord_channel_id;

    // 3. Run validation check
    const { validateAll } = require('../services/credentialValidator');
    const validation = await validateAll({
      githubOwner, githubRepo, githubToken,
      jiraBaseUrl, jiraEmail, jiraApiToken, jiraProjectKey,
      discordBotToken, discordGuildId, discordChannelId
    });

    const updates = {};
    if (project_name) { updates.project_name = project_name; updates.name = project_name; }
    if (description !== undefined) updates.description = description;
    if (project_end_date) updates.project_end_date = project_end_date;
    if (scan_interval_minutes) updates.scan_interval_minutes = Number(scan_interval_minutes);
    if (github_owner !== undefined) updates.github_owner = github_owner;
    if (github_repo !== undefined)  updates.github_repo  = github_repo;
    if (github_token) updates.github_token_enc = encrypt(github_token);
    if (jira_base_url !== undefined)    updates.jira_base_url    = jira_base_url;
    if (jira_email !== undefined)       updates.jira_email       = jira_email;
    if (jira_api_token)   updates.jira_api_token_enc = encrypt(jira_api_token);
    if (jira_project_key !== undefined) updates.jira_project_key = jira_project_key;
    if (discord_bot_token)  updates.discord_bot_token_enc = encrypt(discord_bot_token);
    if (discord_guild_id !== undefined)   updates.discord_guild_id  = discord_guild_id;
    if (discord_channel_id !== undefined) updates.discord_channel_id = discord_channel_id;

    // Save validation status errors to database
    updates.github_error  = validation.github.valid ? null : (validation.github.error || 'Invalid GitHub credentials');
    updates.jira_error    = validation.jira.valid ? null : (validation.jira.error || 'Invalid Jira credentials');
    updates.discord_error = validation.discord.valid ? null : (validation.discord.error || 'Invalid Discord credentials');

    await project.update(updates);
    return res.json({ message: 'Project updated', project: maskProject(project) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update project', detail: err.message });
  }
});

// ─── DELETE /api/projects/:project_id — Soft delete ──────────────────────────
router.delete('/:project_id', async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { project_id: req.params.project_id, user_id: req.user.id }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    await project.update({ is_active: false });
    return res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ─── POST /api/projects/:project_id/rescan ────────────────────────────────────
router.post('/:project_id/rescan', async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { project_id: req.params.project_id, user_id: req.user.id }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const result = await runFullPipeline(project.project_id, project, 'RESCAN', Notification, ScanSchedule);
    return res.json({ message: 'Rescan complete', ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Rescan failed', detail: err.message });
  }
});

// ─── GET /api/projects/:project_id/health-history ────────────────────────────
router.get('/:project_id/health-history', async (req, res) => {
  try {
    const project = await Project.findOne({ where: { project_id: req.params.project_id, user_id: req.user.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const [rows] = await sequelize.query(`
      SELECT ts.scanned_at, ir.stability_score, ir.health_label, ir.anomaly_detected
      FROM telemetry_scans ts
      LEFT JOIN inference_results ir ON ir.scan_id = ts.scan_id
      WHERE ts.project_id = :pid AND ts.scanned_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
      ORDER BY ts.scanned_at ASC
    `, { replacements: { pid: req.params.project_id, days } });

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch health history' });
  }
});

// ─── GET /api/projects/:project_id/alerts ────────────────────────────────────
router.get('/:project_id/alerts', async (req, res) => {
  try {
    const project = await Project.findOne({ where: { project_id: req.params.project_id, user_id: req.user.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const [rows] = await sequelize.query(`
      SELECT * FROM inference_results WHERE project_id = :pid ORDER BY inferred_at DESC LIMIT :lim
    `, { replacements: { pid: req.params.project_id, lim: limit } });

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// ─── GET /api/projects/:project_id/prescriptions ─────────────────────────────
router.get('/:project_id/prescriptions', async (req, res) => {
  try {
    const project = await Project.findOne({ where: { project_id: req.params.project_id, user_id: req.user.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const [rows] = await sequelize.query(`
      SELECT * FROM prescriptions WHERE project_id = :pid ORDER BY generated_at DESC LIMIT :lim
    `, { replacements: { pid: req.params.project_id, lim: limit } });

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

module.exports = router;
