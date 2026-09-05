'use strict';

const express = require('express');
const { Op }  = require('sequelize');
const sequelize = require('../db/connection');
const authMiddleware = require('../middleware/authMiddleware');
const Notification  = require('../models/Notification');
const Project       = require('../models/Project');

const router = express.Router();
router.use(authMiddleware);

// ─── GET /api/dashboard/summary ──────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;

    const [projects] = await sequelize.query(`
      SELECT p.project_id, p.project_name, p.project_end_date,
             ir.health_label, ir.stability_score
      FROM projects p
      LEFT JOIN (
        SELECT ir1.* FROM inference_results ir1
        INNER JOIN (
          SELECT project_id, MAX(inferred_at) AS max_at FROM inference_results GROUP BY project_id
        ) latest ON ir1.project_id = latest.project_id AND ir1.inferred_at = latest.max_at
      ) ir ON ir.project_id = p.project_id
      WHERE p.user_id = :uid AND p.is_active = 1
    `, { replacements: { uid: userId } });

    const total_projects = projects.length;
    let healthy_count = 0, at_risk_count = 0, critical_count = 0, projects_ending_this_week = 0;
    const today = new Date();
    today.setHours(0,0,0,0);

    for (const p of projects) {
      if (p.health_label === 'HEALTHY') healthy_count++;
      else if (p.health_label === 'AT_RISK') at_risk_count++;

      if (p.stability_score !== null && p.stability_score < 30) critical_count++;

      if (p.project_end_date) {
        const end = new Date(p.project_end_date);
        const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0 && daysLeft <= 7) projects_ending_this_week++;
      }
    }

    const unread_count = await Notification.count({ where: { user_id: userId, is_read: false } });

    const [lastScanRow] = await sequelize.query(`
      SELECT MAX(ts.scanned_at) AS last_scan
      FROM telemetry_scans ts
      INNER JOIN projects p ON p.project_id = ts.project_id
      WHERE p.user_id = :uid
    `, { replacements: { uid: userId } });

    return res.json({
      total_projects,
      healthy_count,
      at_risk_count,
      critical_count,
      projects_ending_this_week,
      unread_notifications_count: unread_count,
      last_scan_time: lastScanRow[0]?.last_scan || null
    });
  } catch (err) {
    console.error('[Dashboard] Summary error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// ─── GET /api/dashboard/notifications ────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const { unread_only = 'false', limit = 20 } = req.query;
    const where = { user_id: req.user.id };
    if (unread_only === 'true') where.is_read = false;

    const notifications = await Notification.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit), 100)
    });

    return res.json(notifications);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ─── PUT /api/dashboard/notifications/:id/read ───────────────────────────────
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    await notif.update({ is_read: true });
    return res.json({ message: 'Marked as read' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update notification' });
  }
});

// ─── PUT /api/dashboard/notifications/read-all ───────────────────────────────
router.put('/notifications/read-all', async (req, res) => {
  try {
    await Notification.update({ is_read: true }, { where: { user_id: req.user.id, is_read: false } });
    return res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// ─── DELETE /api/dashboard/notifications/:id ─────────────────────────────────
router.delete('/notifications/:id', async (req, res) => {
  try {
    const deleted = await Notification.destroy({ where: { id: req.params.id, user_id: req.user.id } });
    if (!deleted) return res.status(404).json({ error: 'Notification not found' });
    return res.json({ message: 'Notification deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
});

module.exports = router;
