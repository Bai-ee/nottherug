require('./load-env');

const fs = require('fs').promises;
const path = require('path');
const { runXScout } = require('./xscout');
const { runScribe } = require('./scribe');
const { generateReport } = require('./reporter');
const { requireClientConfig } = require('./clients');
const { DATA_DIR, getLatestBrief, getLatestContent } = require('./store');

const CLIENT_ID = 'not-the-rug';

async function maybeDeleteLatestBrief() {
  const latestPath = path.join(DATA_DIR, 'briefs', CLIENT_ID, 'latest.json');
  try {
    await fs.unlink(latestPath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

function buildArtifactPaths() {
  return {
    latestBriefJsonPath: path.join(DATA_DIR, 'briefs', CLIENT_ID, 'latest.json'),
    latestContentJsonPath: path.join(DATA_DIR, 'content', CLIENT_ID, 'latest-content.json'),
    latestMarkdownPath: path.join(DATA_DIR, 'briefs', CLIENT_ID, 'latest-brief.md'),
    latestHtmlPath: path.join(DATA_DIR, 'briefs', CLIENT_ID, 'latest-brief.html'),
  };
}

async function runNotTheRugBrief(options = {}) {
  const config = requireClientConfig(CLIENT_ID);
  if (options.fresh) {
    await maybeDeleteLatestBrief();
  }

  const pipelineStartedAt = new Date().toISOString();
  const brief = await runXScout(config);
  if (brief.status === 'error') {
    return {
      status: 'error',
      stage: 'scout',
      error: brief.error,
      pipelineStartedAt,
      artifacts: buildArtifactPaths(),
    };
  }

  const scribeOutput = await runScribe(CLIENT_ID, config);
  if (scribeOutput.status === 'error') {
    return {
      status: 'error',
      stage: 'scribe',
      error: scribeOutput.error,
      pipelineStartedAt,
      artifacts: buildArtifactPaths(),
    };
  }

  const reportPaths = await generateReport(scribeOutput, CLIENT_ID);
  const latestBrief = await getLatestBrief(CLIENT_ID);
  const latestContent = await getLatestContent(CLIENT_ID);

  // Aggregate per-stage costs from scout, scribe, guardian
  const scoutStageCosts  = brief.stageCosts || [];
  const scribeStageCost  = scribeOutput.scribeStageCost  || null;
  const guardianStageCost = scribeOutput.guardianStageCost || null;
  const allStageCosts = [
    ...scoutStageCosts,
    ...(scribeStageCost  ? [scribeStageCost]  : []),
    ...(guardianStageCost ? [guardianStageCost] : []),
  ];

  return {
    status: 'success',
    clientId: CLIENT_ID,
    pipelineStartedAt,
    latestBrief,
    latestContent,
    reportPaths,
    artifacts: buildArtifactPaths(),
    guardianFlags: scribeOutput.guardianFlags || null,
    scoutPriorityAction: scribeOutput.scoutPriorityAction || '',
    runCostData: { stageCosts: allStageCosts },
  };
}

async function getLatestNotTheRugArtifacts() {
  return {
    clientId: CLIENT_ID,
    latestBrief: await getLatestBrief(CLIENT_ID),
    latestContent: await getLatestContent(CLIENT_ID),
    artifacts: buildArtifactPaths(),
  };
}

module.exports = {
  CLIENT_ID,
  runNotTheRugBrief,
  getLatestNotTheRugArtifacts,
};
