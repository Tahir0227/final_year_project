const { Octokit } = require('@octokit/rest');
const config = require('../config');

async function fetchGithubMetrics(owner, repo) {
  try {
    if (!config.github.token) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    const octokit = new Octokit({ auth: config.github.token });

    // Ensure thirty days timeframe
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString();

    // 1. Commits & Code Churn
    let commitCount = 0;
    let codeChurn = 0;
    const authorCommitMap = {};

    // Get last 100 commits max for churn & frequency to limit API calls (or iterate pages)
    const commitsRes = await octokit.rest.repos.listCommits({
      owner,
      repo,
      since,
      per_page: 100
    });

    commitCount = commitsRes.data.length;

    for (const c of commitsRes.data) {
      // populate authors
      const author = c.author ? c.author.login : (c.commit.author ? c.commit.author.name : 'Unknown');
      authorCommitMap[author] = (authorCommitMap[author] || 0) + 1;

      // get churn (additions + deletions)
      try {
        const singleCommit = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: c.sha
        });
        if (singleCommit.data.stats) {
          codeChurn += (singleCommit.data.stats.additions + singleCommit.data.stats.deletions);
        }
      } catch (err) {
        console.error(`[${new Date().toISOString()}] [githubAdapter] Error fetching commit stats: ${err.message}`);
      }
    }

    const commit_frequency = commitCount / 30.0;
    
    // Top Contributor & Count
    let top_contributor = 'None';
    let maxCommits = 0;
    const contributor_count = Object.keys(authorCommitMap).length;

    for (const [author, count] of Object.entries(authorCommitMap)) {
      if (count > maxCommits) {
        maxCommits = count;
        top_contributor = author;
      }
    }

    // 2. PR Cycle Time
    const pullsRes = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: 50
    });

    let totalPrTimeMs = 0;
    let prsMerged = 0;

    for (const pr of pullsRes.data) {
      if (pr.merged_at && new Date(pr.created_at) >= thirtyDaysAgo) {
        const created = new Date(pr.created_at);
        const merged = new Date(pr.merged_at);
        totalPrTimeMs += (merged - created);
        prsMerged++;
      }
    }

    const pr_cycle_time_hours = prsMerged > 0 ? (totalPrTimeMs / prsMerged) / (1000 * 60 * 60) : 0;

    return {
      commit_frequency,
      code_churn: codeChurn,
      pr_cycle_time_hours,
      top_contributor,
      contributor_count
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [githubAdapter] ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { fetchGithubMetrics };
