import React, { useState, useMemo } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import {
  BookOpenIcon,
  WrenchScrewdriverIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowDownTrayIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  SparklesIcon,
  HeartIcon,
  CodeBracketIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  BoltIcon,
  CpuChipIcon,
  ServerStackIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// ─── GLOSSARY DATA ─────────────────────────────────────────────────────────────
const GLOSSARY_CATEGORIES = [
  {
    id: 'health',
    title: 'Project Health Indicators',
    icon: HeartIcon,
    description: 'High-level AI health classifications and core stability metrics.',
    terms: [
      {
        name: 'Health Label',
        meaning: 'The overall status of your project determined by the AI model.',
        whyMatters: 'Provides an immediate binary executive indicator whether a software project is operating within safe parameters or heading towards missed delivery and failure.',
        values: 'HEALTHY (project is on track) or AT_RISK (project shows failure signals).',
        whereSeen: 'Dashboard cards, project detail header, alert feed, and notifications.',
        healthyRange: 'HEALTHY',
        riskSignal: 'AT_RISK'
      },
      {
        name: 'Stability Score',
        meaning: 'A continuous number from 0 to 100 representing how stable and resilient your project is. Higher is better. Calculated by the Random Forest AI model.',
        whyMatters: 'Quantifies organizational and engineering risk over time, allowing managers to spot gradual degradation before catastrophic project collapse.',
        ranges: [
          { label: '70 – 100', text: 'Stable (green)', type: 'healthy' },
          { label: '50 – 70', text: 'Watch zone (amber)', type: 'warning' },
          { label: '0 – 50', text: 'Unstable (red)', type: 'critical' }
        ],
        example: 'A score of 22 means the project is highly unstable and requires immediate managerial intervention.'
      },
      {
        name: 'Anomaly Detected',
        meaning: 'The AI has identified an unusual pattern in your telemetry data that does not match any known healthy or at-risk pattern. This is an early warning of an unknown problem.',
        whyMatters: 'Catches unprecedented team dynamics, sudden drop-offs, or abnormal development spikes before standard threshold heuristics trigger.',
        values: 'Yes or No.',
        example: 'If your team suddenly stops all communication overnight while backlog doubles, an anomaly is flagged.'
      },
      {
        name: 'SHAP Risk Drivers',
        meaning: 'The top 3 mathematical reasons why the AI classified your project as AT_RISK. SHAP stands for SHapley Additive exPlanations — a game-theoretic method that explains which signals contributed most to the AI decision.',
        whyMatters: 'Eliminates AI "black-box" uncertainty by isolating the exact bottleneck metrics responsible for the risk classification.',
        example: 'If PR Cycle Time is your top SHAP driver, it means slow code reviews are the single biggest contributor to your project\'s risk score.'
      },
      {
        name: 'Model Agreement',
        meaning: 'Whether all AI models (Support Vector Machine, Random Forest, and Gradient Boosting) agree on the health label.',
        whyMatters: 'Gives managers insight into ensemble consensus and predictive reliability.',
        values: 'FULL (all 3 models agree — high confidence), PARTIAL (2 of 3 models agree — medium confidence), SPLIT (models disagree — treat result with caution).'
      },
      {
        name: 'Prediction Confidence',
        meaning: 'How mathematically certain the AI ensemble is about its classification.',
        whyMatters: 'Helps determine whether automated alerts require urgent executive escalations or further monitoring.',
        values: 'HIGH, MEDIUM, LOW — calculated based on multi-model consensus and prediction class probabilities.'
      }
    ]
  },
  {
    id: 'github',
    title: 'GitHub Metrics',
    icon: CodeBracketIcon,
    description: 'Engineering velocity, code modification volume, and pull request efficiency.',
    terms: [
      {
        name: 'Commit Frequency',
        meaning: 'The average number of code commits your engineering team pushes per day across the past 30 days.',
        whyMatters: 'Consistently low commit frequency can indicate a team that is blocked by dependencies, disengaged, or has stalled in active feature implementation.',
        healthyRange: 'More than 3 – 5 commits per day for an active development squad.',
        riskSignal: 'Below 1 commit per day for multiple consecutive days.'
      },
      {
        name: 'Code Churn',
        meaning: 'The total volume of code lines added, modified, and deleted relative to repository size. High churn means code is being heavily rewritten.',
        whyMatters: 'Excessive churn indicates architecture volatility — code written one day is being scrapped the next, suggesting fluctuating requirements or architectural rework.',
        healthyRange: 'Moderate churn (steady additions with controlled refactoring).',
        riskSignal: 'Very high churn coupled with low commit frequency — classic sign of crisis refactoring or fire-fighting.'
      },
      {
        name: 'PR Cycle Time (Pull Request Cycle Time)',
        meaning: 'The average elapsed hours from when a Pull Request is opened until it is reviewed, approved, and merged into the main codebase.',
        whyMatters: 'Long PR cycle times indicate code changes are stuck waiting for peer review, blocking downstream releases and accumulating merge conflicts.',
        healthyRange: 'Under 24 hours (1 business day).',
        riskSignal: 'Over 48 hours. Critical: Over 72 hours.',
        example: 'If developers submit code changes but nobody reviews them for 4 days, features cannot ship and QA cycles stall.'
      },
      {
        name: 'Contributor Count',
        meaning: 'The number of unique developers actively committing code to the repository within the last 30 days.',
        whyMatters: 'If only one developer is authoring all commits, the project suffers from a "bus factor" of 1 — if that person becomes unavailable, the project freezes.',
        healthyRange: '3 or more active contributing developers.',
        riskSignal: 'Only 1 active contributor (triggers the Knowledge Silo flag).'
      }
    ]
  },
  {
    id: 'jira',
    title: 'Jira / Project Management Metrics',
    icon: ClipboardDocumentListIcon,
    description: 'Sprint planning adherence, issue resolution speed, and backlog stability.',
    terms: [
      {
        name: 'Sprint Velocity Ratio',
        meaning: 'The ratio of story points completed versus story points committed during sprint planning: (Completed Points ÷ Planned Points).',
        whyMatters: 'Proves whether the team is accurately estimating workload and consistently fulfilling sprint commitments.',
        healthyRange: '0.8 or above (completing 80% or more of planned sprint scope).',
        riskSignal: 'Below 0.6 (team completing less than 60% of planned work).',
        example: 'If 50 story points were planned but only 25 were completed, your ratio is 0.50 — a severe velocity risk signal.'
      },
      {
        name: 'Average Task Aging Days (avg_task_aging_days)',
        meaning: 'The average number of days that active, unresolved Jira issues have remained open beyond their target due date.',
        whyMatters: 'Tasks that stay unresolved past deadlines indicate chronic blockers, scope creep, or unrealistic time estimation.',
        healthyRange: 'Under 3 days past due on average.',
        riskSignal: 'Over 7 days past due on average.',
        example: 'If 10 open tasks are each 14 days overdue on average, your task aging metric is 14 days.'
      },
      {
        name: 'Backlog Growth Rate',
        meaning: 'The ratio of newly created issues versus resolved issues over the past 30 days.',
        whyMatters: 'When issue creation outpaces resolution, the backlog expands infinitely, leading to developer burnout and missed milestones.',
        healthyRange: 'Below 1.0 (resolving at least as many tasks as incoming new requests).',
        riskSignal: 'Above 1.5 (backlog growing 50% faster than team throughput).'
      }
    ]
  },
  {
    id: 'discord',
    title: 'Discord / Team Communication Metrics',
    icon: ChatBubbleLeftRightIcon,
    description: 'Collaboration cadence, channel participation, and emotional sentiment analysis.',
    terms: [
      {
        name: 'Messages Per Day',
        meaning: 'The average number of collaboration messages exchanged by the team in the designated Discord or Slack channel per day.',
        whyMatters: 'Communication cadence is a leading indicator of team engagement. Sudden silence almost always precedes milestone delivery failure.',
        healthyRange: 'Consistent communication matching team baseline.',
        riskSignal: 'A sudden drop of 50% or more from the historical baseline.'
      },
      {
        name: 'Active Users',
        meaning: 'The number of unique team members who sent at least one message in the monitored channel in the past 7 days.',
        whyMatters: 'If team participation shrinks to only one or two vocal members, the rest of the team may be disengaged, blocked, or siloed.',
        healthyRange: 'Broad participation across all team members.',
        riskSignal: 'Active users drops to 1 or 2 in a team of 5 or more members.'
      },
      {
        name: 'Sentiment Score',
        meaning: 'A normalized emotional polarity score from -1.0 to +1.0 derived from team messages using VADER AI Natural Language Processing.',
        whyMatters: 'Team sentiment acts as an early warning for developer burnout, interpersonal friction, and morale collapse weeks before output drops.',
        ranges: [
          { label: '+0.5 to +1.0', text: 'Positive (upbeat, motivated, collaborative)', type: 'healthy' },
          { label: '0.0 to +0.5', text: 'Neutral (standard operational updates)', type: 'neutral' },
          { label: '-0.5 to 0.0', text: 'Slightly negative (watch zone / frustration)', type: 'warning' },
          { label: '-1.0 to -0.5', text: 'Critically negative (burnout and conflict risk)', type: 'critical' }
        ],
        example: 'Messages expressing extreme frustration ("impossible to meet deadline", "giving up") drive the score into negative territory.'
      }
    ]
  },
  {
    id: 'flags',
    title: 'AI Risk Flags',
    icon: BoltIcon,
    description: 'Automated boolean trigger heuristics that detect localized organizational failure modes.',
    terms: [
      {
        name: 'Velocity Drop Flag',
        meaning: 'An automated risk flag set by Sentinel when sprint velocity ratio falls below the acceptable delivery threshold.',
        triggersWhen: 'Sprint Velocity Ratio < 0.60 (Completed story points < 60% of planned commitment).'
      },
      {
        name: 'Burnout Flag',
        meaning: 'A dual-condition safety flag triggered when the system detects low communication frequency simultaneous with negative emotional sentiment.',
        triggersWhen: 'messages_per_day < 5 AND sentiment_score < -0.20.',
        whyMatters: 'Either condition alone could be temporary noise, but combined they are an authoritative indicator of team exhaustion and morale breakdown.'
      },
      {
        name: 'Knowledge Silo Flag (silo_flag)',
        meaning: 'A structural risk flag triggered when only 1 developer is actively contributing to the source code repository.',
        whyMatters: 'Severe single point of failure risk. If that engineer is unavailable or leaves, the project codebase cannot be maintained.'
      },
      {
        name: 'Task Aging Flag (aging_flag)',
        meaning: 'A workflow bottleneck flag triggered when unresolved Jira issues sit overdue for an excessive duration.',
        triggersWhen: 'Average task aging (avg_task_aging_days) exceeds 7 days.'
      }
    ]
  },
  {
    id: 'prescription',
    title: 'AI Prescription Terms',
    icon: SparklesIcon,
    description: 'LLM-generated remediation recovery workflows, root cause breakdowns, and severity tiers.',
    terms: [
      {
        name: 'Management Prescription',
        meaning: 'An AI-generated recovery strategy generated by Groq LLM (llama-3.3-70b-versatile) whenever a project is classified as AT_RISK or unstable.',
        whyMatters: 'Transforms raw mathematical metrics into concrete, actionable managerial directives tailored to the specific team bottlenecks.'
      },
      {
        name: 'Severity Level',
        meaning: 'The urgency and priority classification assigned to an AI prescription recovery plan.',
        ranges: [
          { label: 'CRITICAL', text: 'Stability score < 30 or anomaly detected with score < 50. Immediate executive intervention required.', type: 'critical' },
          { label: 'HIGH', text: 'Stability score 30 – 50. Action required within 48 hours to avert milestone failure.', type: 'warning' },
          { label: 'MEDIUM', text: 'Stability score 50 – 70. Monitor closely and plan targeted workflow adjustments.', type: 'neutral' },
          { label: 'LOW', text: 'Stability score ≥ 70 with isolated minor warnings. Routine review recommended.', type: 'healthy' }
        ]
      },
      {
        name: 'Root Cause Summary',
        meaning: 'A concise, executive 2–3 sentence plain English explanation synthesizing why the AI flagged the project, citing the exact telemetry signals and SHAP drivers.',
        whyMatters: 'Gives leadership instant situational awareness without needing to comb through raw telemetry logs.'
      },
      {
        name: 'Action Steps',
        meaning: 'Exactly 5 concrete, actionable recovery steps produced by the AI for the project manager to execute.',
        whyMatters: 'Provides an immediate, step-by-step roadmap addressing root causes such as code review backlog, ticket reallocation, or team burnout.'
      }
    ]
  },
  {
    id: 'system',
    title: 'System & Platform Terms',
    icon: ServerStackIcon,
    description: 'Telemetry ingestion cycles, background scheduler states, and project lifecycle controls.',
    terms: [
      {
        name: 'Telemetry Scan',
        meaning: 'One comprehensive cycle of automated data extraction from GitHub, Jira, and Discord APIs, followed by feature normalization and ML model inference.',
        whyMatters: 'Captures fresh time-series metrics to update project health indicators and alert feeds.'
      },
      {
        name: 'Scan Status',
        meaning: 'The execution health of a telemetry scan cycle across third-party integration adapters.',
        ranges: [
          { label: 'COMPLETE', text: 'All three sources (GitHub, Jira, Discord) fetched and processed successfully.', type: 'healthy' },
          { label: 'PARTIAL', text: '1 or 2 sources fetched, but one adapter encountered an API error or timeout.', type: 'warning' },
          { label: 'FAILED', text: 'All data sources failed to connect. Check your integration credentials.', type: 'critical' }
        ]
      },
      {
        name: 'Re-scan (Manual Pipeline Run)',
        meaning: 'An on-demand trigger accessible from the project dashboard that immediately executes the full telemetry extraction, ML inference, and AI prescription pipeline.',
        whyMatters: 'Allows project managers to verify updated credentials or view immediate health changes after team workflow interventions.'
      },
      {
        name: 'Project End Date',
        meaning: 'The target completion deadline configured during project creation.',
        whyMatters: 'Used by the system to compute days remaining, trigger deadline proximity alerts (≤ 7 days), and manage project archiving.'
      },
      {
        name: 'Scan Frequency',
        meaning: 'The automated background interval at which Sentinel polls project integrations (default: Once every 24 hours / 1440 minutes).'
      }
    ]
  }
];

// ─── SETUP GUIDE DATA ─────────────────────────────────────────────────────────
const SETUP_SECTIONS = [
  {
    id: 'github',
    title: 'Section 1 — GitHub Integration Credentials',
    icon: CodeBracketIcon,
    badge: 'Source Control',
    description: 'Configure GitHub authentication to monitor commit velocity, code churn, and PR cycle times.',
    fields: [
      {
        name: 'GITHUB_OWNER',
        badge: 'Owner / Org',
        summary: 'Your GitHub personal username or organisation account name.',
        steps: [
          'Log in to your account at https://github.com.',
          'Click your profile picture in the top-right corner of the GitHub interface.',
          'Your username is displayed right below your profile name (e.g. "@johndoe").',
          'For an organisation repository, open the repository page — the owner is the entity name before the slash in the URL: github.com/OWNER/repo-name.'
        ],
        example: 'In "github.com/microsoft/vscode", the GITHUB_OWNER value is "microsoft".'
      },
      {
        name: 'GITHUB_REPO',
        badge: 'Repository Name',
        summary: 'The exact repository name you wish to monitor.',
        steps: [
          'Navigate to your project repository on GitHub.',
          'The repository name is displayed at the top of the repository page and after the owner slash in the browser URL: github.com/username/REPO-NAME.'
        ],
        example: 'In "github.com/microsoft/vscode", the GITHUB_REPO value is "vscode".',
        warning: 'Repository names are case-sensitive and must match exactly.'
      },
      {
        name: 'GITHUB_TOKEN',
        badge: 'Personal Access Token',
        summary: 'A secure Personal Access Token (PAT) that grants Sentinel read access to repository commits and pull requests.',
        steps: [
          'Log in to GitHub, click your profile picture → "Settings".',
          'In the left sidebar, scroll down to the bottom and click "Developer settings".',
          'Click "Personal access tokens" → "Tokens (classic)".',
          'Click "Generate new token" → select "Generate new token (classic)".',
          'Set a descriptive note: "Sentinel-Health-AI".',
          'Set token expiration: "90 days" (or "No expiration" for long-term production).',
          'Enable the following required permission scopes:\n• ✅ repo (Full control of private repositories)\n• ✅ read:org (Read organisation membership and teams)',
          'Scroll down and click "Generate token".',
          'COPY THE GENERATED TOKEN IMMEDIATELY — GitHub will never display it again.'
        ],
        securityTip: 'Never share your token. Sentinel-Health AI encrypts all tokens with AES-256-CBC encryption before storing them in MySQL.',
        warning: 'If you close the page before copying your token, you will need to revoke it and generate a fresh token.'
      }
    ]
  },
  {
    id: 'jira',
    title: 'Section 2 — Jira Cloud Integration Credentials',
    icon: ClipboardDocumentListIcon,
    badge: 'Issue Tracking',
    description: 'Connect your Atlassian Jira workspace to analyze sprint velocity, task aging, and backlog health.',
    fields: [
      {
        name: 'JIRA_BASE_URL',
        badge: 'Atlassian Domain',
        summary: 'The base web address of your Jira Cloud workspace.',
        steps: [
          'Log in to your Atlassian workspace at https://www.atlassian.com.',
          'Look at your browser address bar — your base URL consists of everything up to and including ".atlassian.net".'
        ],
        example: 'https://acme-corp.atlassian.net (Do NOT append any trailing slash or sub-path like /jira/your-work).'
      },
      {
        name: 'JIRA_EMAIL',
        badge: 'Account Email',
        summary: 'The email address associated with your Jira / Atlassian account.',
        steps: [
          'Log in to Jira.',
          'Click your profile avatar in the top-right header → click "Profile".',
          'Verify the primary email address listed under your name.'
        ],
        securityTip: 'This email must belong to the same Atlassian user who generates the Jira API token below.'
      },
      {
        name: 'JIRA_API_TOKEN',
        badge: 'Atlassian API Token',
        summary: 'A secure API token that authenticates Jira REST API requests.',
        steps: [
          'Navigate to https://id.atlassian.com/manage-profile/security/api-tokens.',
          'Click the "Create API token" button.',
          'Enter a label for identification: "Sentinel-Health-AI".',
          'Click "Create".',
          'Click "Copy" to save the token string to your clipboard.'
        ],
        securityTip: 'Sentinel-Health securely encrypts this token with AES-256 at rest.',
        warning: 'Atlassian only shows this token once upon creation. Copy it immediately before dismissing the dialog.'
      },
      {
        name: 'JIRA_PROJECT_KEY',
        badge: 'Project Identifier',
        summary: 'The short uppercase prefix code identifying your target Jira project.',
        steps: [
          'Open your project board or backlog in Jira.',
          'Check the browser address URL: .../projects/KEY/boards — the KEY is your project key.',
          'Alternatively, look at any issue ticket on your board (e.g. in "PROJ-142", the project key is "PROJ").'
        ],
        example: 'Common project keys: PROJ, SCRUM, BACKEND, DEV, MOBILE.',
        securityTip: 'Sentinel-Health scopes metrics collection exclusively to this key, leaving other workspace projects untouched.'
      }
    ]
  },
  {
    id: 'discord',
    title: 'Section 3 — Discord Bot Integration Credentials',
    icon: ChatBubbleLeftRightIcon,
    badge: 'Team Sentiment',
    description: 'Set up a custom Discord bot to analyze communication volume and NLP team sentiment.',
    fields: [
      {
        name: 'DISCORD_BOT_TOKEN',
        badge: 'Bot Authentication Token',
        summary: 'The secret authentication token for your Discord bot application.',
        steps: [
          'Go to the Discord Developer Portal at https://discord.com/developers/applications.',
          'Click "New Application" in the top right — name it "Sentinel-Health-Bot".',
          'In the left sidebar, click "Bot".',
          'Click "Add Bot" (or confirm with "Yes, do it!").',
          'Under the bot username field, click "Reset Token" → confirm with "Yes, do it!".',
          'Copy the token string to your clipboard.',
          'Scroll down to the "Privileged Gateway Intents" section and ENABLE:\n• ✅ MESSAGE CONTENT INTENT\n• ✅ SERVER MEMBERS INTENT',
          'Click "Save Changes" at the bottom of the page.'
        ],
        securityTip: 'Never reveal your bot token publicly. It provides complete message access to channels where the bot is invited.'
      },
      {
        name: 'DISCORD_GUILD_ID (Server ID)',
        badge: 'Server ID',
        summary: 'The unique numeric identifier of your Discord server.',
        steps: [
          'Open Discord (desktop app or browser).',
          'Open "User Settings" (gear icon beside your avatar at bottom left) → "Advanced".',
          'Toggle "Developer Mode" to ON.',
          'Close settings, right-click your Discord server icon in the left server bar, and click "Copy Server ID".'
        ],
        example: 'A numeric ID string like "1542272761957720124".'
      },
      {
        name: 'DISCORD_CHANNEL_ID',
        badge: 'Monitored Channel ID',
        summary: 'The numeric identifier of the specific text channel where project collaboration occurs.',
        steps: [
          'Ensure Developer Mode is enabled in Discord settings.',
          'Right-click on the specific project channel name (e.g. #dev-team, #general, #project-sprint) in the server channel list.',
          'Click "Copy Channel ID" from the context menu.'
        ],
        example: 'A numeric ID string like "1542272762725273724".'
      }
    ],
    botInviteGuide: {
      title: 'How to Invite Your Bot to Your Discord Server',
      steps: [
        'In the Discord Developer Portal, open your bot application.',
        'In the left navigation menu, click "OAuth2" → "URL Generator".',
        'Under "Scopes", select: ✅ bot.',
        'Under "Bot Permissions", select:\n• ✅ Read Messages/View Channels\n• ✅ Read Message History',
        'Copy the generated OAuth2 URL at the bottom and paste it into a new browser tab.',
        'Select your Discord server from the dropdown list and click "Authorize".',
        'Your bot will immediately join your server and appear in the channel member list.'
      ]
    }
  }
];

export default function UserGuidePage() {
  const [activeTab, setActiveTab] = useState('glossary'); // 'glossary' | 'setup'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({
    health: true,
    github: true,
    jira: true,
    discord: true,
    flags: true,
    prescription: true,
    system: true
  });
  const [expandedSetupSections, setExpandedSetupSections] = useState({
    github: false,
    jira: false,
    discord: false
  });
  const [copiedField, setCopiedField] = useState(null);

  // ─── Search Filtering ─────────────────────────────────────────────────────────
  const totalTermsCount = useMemo(() => {
    return GLOSSARY_CATEGORIES.reduce((acc, cat) => acc + cat.terms.length, 0);
  }, []);

  const filteredGlossary = useMemo(() => {
    if (!searchQuery.trim()) {
      return GLOSSARY_CATEGORIES;
    }
    const q = searchQuery.toLowerCase().trim();
    return GLOSSARY_CATEGORIES.map((cat) => {
      const matchingTerms = cat.terms.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.meaning.toLowerCase().includes(q) ||
          (t.whyMatters && t.whyMatters.toLowerCase().includes(q)) ||
          (t.example && t.example.toLowerCase().includes(q)) ||
          (t.healthyRange && t.healthyRange.toLowerCase().includes(q)) ||
          (t.riskSignal && t.riskSignal.toLowerCase().includes(q))
      );
      return {
        ...cat,
        terms: matchingTerms
      };
    }).filter((cat) => cat.terms.length > 0);
  }, [searchQuery]);

  const matchedTermsCount = useMemo(() => {
    return filteredGlossary.reduce((acc, cat) => acc + cat.terms.length, 0);
  }, [filteredGlossary]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const toggleCategory = (catId) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const toggleAllCategories = (expand) => {
    const next = {};
    GLOSSARY_CATEGORIES.forEach((c) => {
      next[c.id] = expand;
    });
    setExpandedCategories(next);
  };

  const toggleSetupSection = (secId) => {
    setExpandedSetupSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  const toggleAllSetupSections = (expand) => {
    const next = {};
    SETUP_SECTIONS.forEach((s) => {
      next[s.id] = expand;
    });
    setExpandedSetupSections(next);
  };

  const handleCopyText = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied "${fieldName}" to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadPDF = () => {
    const link = document.createElement('a');
    link.href = '/setup-guide.pdf';
    link.download = 'Sentinel-Health-AI-Setup-Guide.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Setup guide download started!');
  };

  const scrollToCategory = (catId) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: true }));
    const elem = document.getElementById(`category-${catId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen pl-64 pt-16 bg-dark-950 text-dark-100">
      <Sidebar />
      <Navbar />

      <main className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in pb-16">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600/20 text-primary-400 border border-primary-500/30 flex items-center justify-center shadow-lg shadow-primary-950/50">
                <BookOpenIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">User Guide & Reference</h1>
                <p className="text-xs text-dark-400 mt-0.5">
                  Comprehensive documentation for AI metrics, risk indicators, and integration setup.
                </p>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-dark-900 border border-dark-800 rounded-xl shadow-inner">
            <button
              onClick={() => setActiveTab('glossary')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'glossary'
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-900/50'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
              }`}
            >
              <BookOpenIcon className="w-4 h-4" />
              Glossary of Terms
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-dark-800 text-dark-300 font-mono">
                {totalTermsCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('setup')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'setup'
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-900/50'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
              }`}
            >
              <WrenchScrewdriverIcon className="w-4 h-4" />
              Setup Guide
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-dark-800 text-dark-300 font-mono">
                3 Steps
              </span>
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 1: GLOSSARY OF TERMS
           ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'glossary' && (
          <div className="space-y-6">
            {/* Quick Navigation & Search Header */}
            <div className="card p-5 border border-dark-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="w-5 h-5 text-dark-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search any metric, formula, or risk flag (e.g., PR Cycle Time, SHAP, Velocity, Burnout)..."
                    className="input pl-11 pr-10 py-2.5 w-full text-sm bg-dark-950 border-dark-700/60 focus:border-primary-500 placeholder:text-dark-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-dark-400 hover:text-white bg-dark-800 px-1.5 py-0.5 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick Expand/Collapse Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAllCategories(true)}
                    className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
                  >
                    <ChevronDownIcon className="w-3.5 h-3.5" />
                    Expand All
                  </button>
                  <button
                    onClick={() => toggleAllCategories(false)}
                    className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
                  >
                    <ChevronUpIcon className="w-3.5 h-3.5" />
                    Collapse All
                  </button>
                </div>
              </div>

              {/* Quick Jump Category Chips */}
              <div className="pt-2 border-t border-dark-800/60 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-dark-400 uppercase tracking-wider mr-1">
                  Jump to Category:
                </span>
                {GLOSSARY_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => scrollToCategory(cat.id)}
                      className="px-2.5 py-1 rounded-lg bg-dark-800/70 hover:bg-primary-950/40 hover:border-primary-500/30 border border-dark-750 text-xs font-medium text-dark-300 hover:text-primary-300 transition-colors flex items-center gap-1.5"
                    >
                      <Icon className="w-3.5 h-3.5 text-primary-400" />
                      {cat.title.split('—')[0].trim()}
                    </button>
                  );
                })}
              </div>

              {/* Status Bar */}
              <div className="text-xs text-dark-400 flex items-center justify-between">
                <span>
                  Showing <strong className="text-white font-mono">{matchedTermsCount}</strong> terms across{' '}
                  <strong className="text-white font-mono">{filteredGlossary.length}</strong> categories
                </span>
                {searchQuery && (
                  <span className="text-primary-400 italic">
                    Filtering by: "{searchQuery}"
                  </span>
                )}
              </div>
            </div>

            {/* Glossary Categories Accordion */}
            {filteredGlossary.length === 0 ? (
              <div className="card p-12 text-center border border-dark-800 space-y-3">
                <InformationCircleIcon className="w-10 h-10 text-dark-500 mx-auto" />
                <h3 className="text-base font-bold text-white">No Matching Terms Found</h3>
                <p className="text-xs text-dark-400 max-w-md mx-auto">
                  We could not find any glossary definitions matching "{searchQuery}". Try searching for related keywords like "sprint", "churn", "model", or "score".
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="btn-primary text-xs px-4 py-2 mt-2 inline-block"
                >
                  Reset Search Filter
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredGlossary.map((cat, catIdx) => {
                  const Icon = cat.icon;
                  const isExpanded = !!expandedCategories[cat.id];

                  return (
                    <div
                      key={cat.id}
                      id={`category-${cat.id}`}
                      className="card border border-dark-800/80 overflow-hidden shadow-xl"
                    >
                      {/* Accordion Category Header */}
                      <button
                        onClick={() => toggleCategory(cat.id)}
                        className="w-full p-5 bg-dark-900/90 hover:bg-dark-850 flex items-center justify-between transition-colors border-b border-dark-800 text-left"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="p-2.5 rounded-xl bg-primary-600/15 text-primary-400 border border-primary-500/20">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono uppercase tracking-widest text-primary-400 font-bold">
                                Category {catIdx + 1}
                              </span>
                              <span className="text-dark-600">•</span>
                              <span className="text-xs text-dark-400">
                                {cat.terms.length} {cat.terms.length === 1 ? 'term' : 'terms'}
                              </span>
                            </div>
                            <h2 className="text-lg font-bold text-white leading-tight mt-0.5">
                              {cat.title}
                            </h2>
                            <p className="text-xs text-dark-400 mt-0.5">{cat.description}</p>
                          </div>
                        </div>

                        <div className="p-1.5 rounded-lg bg-dark-800 text-dark-300">
                          {isExpanded ? (
                            <ChevronUpIcon className="w-4 h-4" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {/* Terms List */}
                      {isExpanded && (
                        <div className="p-5 grid grid-cols-1 gap-4 bg-dark-950/40">
                          {cat.terms.map((term, tIdx) => (
                            <div
                              key={tIdx}
                              className="p-5 rounded-xl bg-dark-900/70 border border-dark-800 hover:border-dark-700 transition-all space-y-3.5 shadow-sm"
                            >
                              {/* Term Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-800/60 pb-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                                  <h3 className="text-base font-bold text-white tracking-wide">
                                    {term.name}
                                  </h3>
                                </div>
                                {searchQuery && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-dark-800 text-primary-400 font-medium self-start sm:self-auto">
                                    {cat.title.split('—')[0].trim()}
                                  </span>
                                )}
                              </div>

                              {/* What It Means */}
                              <div className="space-y-1">
                                <span className="text-[11px] font-bold text-primary-400 uppercase tracking-wider block">
                                  What it means:
                                </span>
                                <p className="text-sm text-dark-200 leading-relaxed font-normal">
                                  {term.meaning}
                                </p>
                              </div>

                              {/* Why It Matters */}
                              {term.whyMatters && (
                                <div className="space-y-1">
                                  <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">
                                    Why it matters:
                                  </span>
                                  <p className="text-xs text-dark-300 leading-relaxed">
                                    {term.whyMatters}
                                  </p>
                                </div>
                              )}

                              {/* Values / Triggers */}
                              {term.values && (
                                <div className="p-3 rounded-lg bg-dark-950/80 border border-dark-800/80 text-xs">
                                  <strong className="text-dark-300 font-semibold">Possible Values: </strong>
                                  <span className="text-white font-mono">{term.values}</span>
                                </div>
                              )}

                              {term.triggersWhen && (
                                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200 flex items-start gap-2">
                                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="text-amber-300">Trigger Condition: </strong>
                                    <span className="font-mono text-amber-100">{term.triggersWhen}</span>
                                  </div>
                                </div>
                              )}

                              {/* Ranges Breakdown */}
                              {term.ranges && (
                                <div className="space-y-1.5 pt-1">
                                  <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">
                                    Score Ranges & Meanings:
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {term.ranges.map((r, rIdx) => (
                                      <div
                                        key={rIdx}
                                        className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
                                          r.type === 'healthy'
                                            ? 'bg-green-950/20 border-green-800/40 text-green-300'
                                            : r.type === 'critical'
                                            ? 'bg-red-950/20 border-red-800/40 text-red-300'
                                            : r.type === 'warning'
                                            ? 'bg-amber-950/20 border-amber-800/40 text-amber-300'
                                            : 'bg-dark-800/60 border-dark-750 text-dark-300'
                                        }`}
                                      >
                                        <span className="font-bold font-mono text-white text-xs">{r.label}</span>
                                        <span className="text-[11px] mt-0.5 opacity-90">{r.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Badges: Healthy Range vs Risk Signal */}
                              {(term.healthyRange || term.riskSignal) && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {term.healthyRange && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-950/30 border border-green-800/40 text-green-400 text-xs font-medium">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                      <strong>Healthy Range:</strong> {term.healthyRange}
                                    </div>
                                  )}
                                  {term.riskSignal && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/30 border border-red-800/40 text-red-400 text-xs font-medium">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                      <strong>Risk Signal:</strong> {term.riskSignal}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Where Seen & Examples */}
                              {term.whereSeen && (
                                <div className="text-xs text-dark-400 flex items-center gap-1.5 pt-1">
                                  <span className="font-semibold text-dark-300">Where you see it:</span>
                                  <span>{term.whereSeen}</span>
                                </div>
                              )}

                              {term.example && (
                                <div className="p-3 rounded-lg bg-dark-950 border border-dark-800 text-xs italic text-dark-300 flex items-start gap-2">
                                  <span className="font-bold text-primary-400 not-italic">Example:</span>
                                  <span>"{term.example}"</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 2: SETUP GUIDE (CREDENTIALS)
           ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'setup' && (
          <div className="space-y-6">
            {/* Top Download PDF Callout Banner */}
            <div className="card p-6 bg-gradient-to-r from-primary-950/60 via-dark-900 to-dark-900 border border-primary-500/30 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-primary-600/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="p-3.5 rounded-2xl bg-primary-600/20 text-primary-400 border border-primary-500/40 flex-shrink-0 shadow-lg shadow-primary-950/50">
                    <BookOpenIcon className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-[11px] font-bold uppercase tracking-wider">
                      <SparklesIcon className="w-3.5 h-3.5" /> Printable Manual
                    </div>
                    <h2 className="text-xl font-extrabold text-white">Download Complete Setup Guide PDF</h2>
                    <p className="text-xs text-dark-300 max-w-xl leading-relaxed">
                      Get a comprehensive step-by-step PDF manual containing complete token creation walkthroughs, permission configuration screenshots, and security best practices.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
                  <button
                    onClick={handleDownloadPDF}
                    className="btn-primary py-3 px-6 text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-primary-950/80 font-bold"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Download PDF Guide
                  </button>
                  <span className="text-[11px] text-dark-400">PDF document • 10 credentials covered</span>
                </div>
              </div>
            </div>

            {/* Tab 2 Toolbar Controls */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-dark-400">
                Click any integration phase below to expand detailed instructions.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAllSetupSections(true)}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <ChevronDownIcon className="w-3.5 h-3.5" />
                  Expand All
                </button>
                <button
                  onClick={() => toggleAllSetupSections(false)}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <ChevronUpIcon className="w-3.5 h-3.5" />
                  Collapse All
                </button>
              </div>
            </div>

            {/* Guide Sections */}
            <div className="space-y-6">
              {SETUP_SECTIONS.map((sec, secIdx) => {
                const Icon = sec.icon;
                const isExpanded = !!expandedSetupSections[sec.id];

                return (
                  <div
                    key={sec.id}
                    className="card border border-dark-800 overflow-hidden shadow-xl"
                  >
                    {/* Collapsible Section Header */}
                    <button
                      onClick={() => toggleSetupSection(sec.id)}
                      className="w-full p-6 bg-dark-900 hover:bg-dark-850 flex items-center justify-between transition-colors border-b border-dark-800 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary-600/15 text-primary-400 border border-primary-500/20">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-primary-400 font-bold">
                              Setup Phase {secIdx + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-dark-800 text-dark-300 font-semibold">
                              {sec.badge}
                            </span>
                          </div>
                          <h2 className="text-lg font-extrabold text-white leading-tight mt-0.5">
                            {sec.title}
                          </h2>
                          <p className="text-xs text-dark-400 mt-0.5">{sec.description}</p>
                        </div>
                      </div>

                      <div className="p-1.5 rounded-lg bg-dark-800 text-dark-300">
                        {isExpanded ? (
                          <ChevronUpIcon className="w-4 h-4" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {/* Section Fields Breakdown */}
                    {isExpanded && (
                      <div className="p-6 space-y-6 bg-dark-950/40">
                        {sec.fields.map((f, fIdx) => (
                          <div
                            key={fIdx}
                            className="p-6 rounded-2xl bg-dark-900/80 border border-dark-800 space-y-4 shadow-sm"
                          >
                            {/* Credential Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-dark-800 pb-3">
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-lg bg-dark-950 border border-primary-500/30 text-primary-300 font-mono text-xs font-bold shadow-inner">
                                  {f.name}
                                </span>
                                <span className="text-xs text-dark-400 font-medium">
                                  {f.badge}
                                </span>
                              </div>

                              <button
                                onClick={() => handleCopyText(f.name, f.name)}
                                className="inline-flex items-center gap-1.5 text-xs text-dark-400 hover:text-white bg-dark-800/80 hover:bg-dark-750 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                {copiedField === f.name ? (
                                  <>
                                    <CheckIcon className="w-3.5 h-3.5 text-green-400" />
                                    <span className="text-green-400 font-semibold">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                                    <span>Copy Field Name</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Summary */}
                            <p className="text-xs text-dark-200 leading-relaxed font-normal">
                              {f.summary}
                            </p>

                            {/* Step by Step Numbered Flow */}
                            <div className="space-y-2 pt-1">
                              <span className="text-[11px] font-bold text-primary-400 uppercase tracking-wider block">
                                Step-by-Step Instructions:
                              </span>
                              <div className="space-y-2">
                                {f.steps.map((step, sIdx) => (
                                  <div key={sIdx} className="flex items-start gap-3 text-xs text-dark-300">
                                    <span className="w-5 h-5 rounded-full bg-primary-950 text-primary-400 border border-primary-500/40 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5 shadow-sm">
                                      {sIdx + 1}
                                    </span>
                                    <span className="leading-relaxed whitespace-pre-line text-dark-200">{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Example Output */}
                            {f.example && (
                              <div className="p-3 rounded-xl bg-dark-950 border border-dark-800 text-xs text-dark-300 flex items-start gap-2">
                                <span className="font-bold text-primary-400">Format Example:</span>
                                <span className="font-mono text-white">{f.example}</span>
                              </div>
                            )}

                            {/* Security Callout Box (Green) */}
                            {f.securityTip && (
                              <div className="p-3.5 rounded-xl bg-green-950/20 border border-green-800/40 text-xs text-green-200 flex items-start gap-3">
                                <ShieldCheckIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-green-300 block mb-0.5">Security Notice:</strong>
                                  <span className="leading-relaxed">{f.securityTip}</span>
                                </div>
                              </div>
                            )}

                            {/* Warning Callout Box (Amber) */}
                            {f.warning && (
                              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200 flex items-start gap-3">
                                <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-amber-300 block mb-0.5">Important Warning:</strong>
                                  <span className="leading-relaxed">{f.warning}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Optional Bot Invite Walkthrough (For Discord) */}
                        {sec.botInviteGuide && (
                          <div className="p-6 rounded-2xl bg-gradient-to-r from-primary-950/30 to-dark-900 border border-primary-500/30 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary-600/20 text-primary-400 border border-primary-500/30">
                                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-white">
                                  {sec.botInviteGuide.title}
                                </h3>
                                <p className="text-xs text-dark-400">
                                  Required one-time authorization to link the Discord bot to your team server
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2 pt-1">
                              {sec.botInviteGuide.steps.map((step, sIdx) => (
                                <div key={sIdx} className="flex items-start gap-3 text-xs text-dark-300">
                                  <span className="w-5 h-5 rounded-full bg-primary-900/60 text-primary-300 border border-primary-500/30 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                                    {sIdx + 1}
                                  </span>
                                  <span className="leading-relaxed whitespace-pre-line text-dark-200">{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
