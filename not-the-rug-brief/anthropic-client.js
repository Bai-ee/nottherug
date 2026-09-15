require('./load-env');
const { fetchWithTimeout } = require('./http');

// Model calls are billed per request, so the retry budget here is small (1
// retry) — enough to survive a transient 5xx/429 without doubling spend on
// every call. Overridable for slower prompts (e.g. web_search tool calls).
const ANTHROPIC_TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS) || 45_000;
const ANTHROPIC_RETRIES = Number(process.env.ANTHROPIC_RETRIES) || 1;

function requireAnthropicApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY for Not The Rug brief pipeline');
  }
  return apiKey;
}

async function createMessage(params) {
  const apiKey = requireAnthropicApiKey();
  const response = await fetchWithTimeout(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(params),
    },
    { timeoutMs: ANTHROPIC_TIMEOUT_MS, retries: ANTHROPIC_RETRIES, label: 'Anthropic API' },
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Anthropic API ${response.status}: ${text.slice(0, 400)}`);
  }

  return JSON.parse(text);
}

function createAnthropicClient() {
  return {
    messages: {
      create: createMessage,
    },
  };
}

module.exports = {
  createAnthropicClient,
  requireAnthropicApiKey,
};
