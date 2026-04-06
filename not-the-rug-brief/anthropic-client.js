require('./load-env');

const Anthropic = require('@anthropic-ai/sdk');

function requireAnthropicApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY for Not The Rug brief pipeline');
  }
  return apiKey;
}

function createAnthropicClient() {
  return new Anthropic({
    apiKey: requireAnthropicApiKey(),
  });
}

module.exports = {
  createAnthropicClient,
  requireAnthropicApiKey,
};
