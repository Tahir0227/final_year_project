const { fetchGithubMetrics } = require('./adapters/githubAdapter');
const { fetchJiraMetrics } = require('./adapters/jiraAdapter');
const { fetchDiscordMetrics } = require('./adapters/discordAdapter');

async function test() {
  console.log("Testing GitHub...");
  const gh = await fetchGithubMetrics('Tahir0227', 'my-software-project');
  console.log("GitHub:", gh);

  console.log("\nTesting Jira...");
  const jira = await fetchJiraMetrics('SCRUM');
  console.log("Jira:", jira);

  console.log("\nTesting Discord...");
  const disc = await fetchDiscordMetrics('1496039331565932626', '1496039331565932633');
  console.log("Discord:", disc);
}

test();
