/**
 * githubAdapter.js — Fetches GitHub metrics.
 * Accepts optional per-project credentials; falls back to global config.
 */

'use strict';

const { Octokit } = require('@octokit/rest');
const config = require('../config');

/**
 * @param {string} owner
 * @param {string} repo
 * @param {object} [credentials] - { token } — overrides global config if provided
 */
async function fetchGithubMetrics(owner, repo, credentials = {}) {
  try {
    const token = credentials.token;
    if (!token) throw new Error('GitHub token not configured. Please update your project integration settings.');

    const octokit = new Octokit({ auth: token });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString();

    // 1. Commits & Code Churn
    let commitCount = 0;
    let codeChurn = 0;
    const authorCommitMap = {};

    const commitsRes = await octokit.rest.repos.listCommits({
      owner, repo, since, per_page: 100
    });

    commitCount = commitsRes.data.length;

    for (const c of commitsRes.data) {
      const author = c.author ? c.author.login : (c.commit.author ? c.commit.author.name : 'Unknown');
      authorCommitMap[author] = (authorCommitMap[author] || 0) + 1;

      try {
        const singleCommit = await octokit.rest.repos.getCommit({ owner, repo, ref: c.sha });
        if (singleCommit.data.stats) {
          codeChurn += (singleCommit.data.stats.additions + singleCommit.data.stats.deletions);
        }
      } catch (err) {
        console.error(`[githubAdapter] Error fetching commit stats: ${err.message}`);
      }
    }

    const commit_frequency = commitCount / 30.0;
    let top_contributor = 'None';
    let maxCommits = 0;
    const contributor_count = Object.keys(authorCommitMap).length;

    for (const [author, count] of Object.entries(authorCommitMap)) {
      if (count > maxCommits) { maxCommits = count; top_contributor = author; }
    }

    // 2. PR Cycle Time
    const pullsRes = await octokit.rest.pulls.list({
      owner, repo, state: 'closed', sort: 'updated', direction: 'desc', per_page: 50
    });

    let totalPrTimeMs = 0;
    let prsMerged = 0;

    for (const pr of pullsRes.data) {
      if (pr.merged_at && new Date(pr.created_at) >= thirtyDaysAgo) {
        totalPrTimeMs += (new Date(pr.merged_at) - new Date(pr.created_at));
        prsMerged++;
      }
    }

    const pr_cycle_time_hours = prsMerged > 0 ? (totalPrTimeMs / prsMerged) / (1000 * 60 * 60) : 0;

    return { commit_frequency, code_churn: codeChurn, pr_cycle_time_hours, top_contributor, contributor_count };

  } catch (error) {
    console.error(`[githubAdapter] ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { fetchGithubMetrics };
