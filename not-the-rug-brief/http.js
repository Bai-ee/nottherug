// http.js — bounded fetch for remote provider calls.
//
// Every external provider stage (Anthropic, NWS, Reddit, Instagram) must not
// hang the pipeline indefinitely, and must not retry indefinitely either.
// This wraps fetch() with a hard timeout (AbortController) and a small retry
// budget for transient failures only — a non-retryable HTTP status (4xx other
// than 429) is returned immediately so callers can fail fast.

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;

function isRetryableStatus(status) {
  return status === 429 || (status >= 500 && status < 600);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch() with a hard timeout and a small retry budget for transient
 * failures (network errors, timeouts, 429, 5xx). A non-retryable response
 * (e.g. 400/401/404) is returned as-is on the first attempt — the caller
 * decides how to interpret a non-ok response.
 */
async function fetchWithTimeout(url, options = {}, config = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    label = url,
  } = config;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok && isRetryableStatus(response.status) && attempt < retries) {
        lastError = new Error(`${label}: ${response.status} (retrying)`);
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      const aborted = error && error.name === 'AbortError';
      lastError = aborted ? new Error(`${label}: timed out after ${timeoutMs}ms`) : error;
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

module.exports = { fetchWithTimeout, DEFAULT_TIMEOUT_MS, DEFAULT_RETRIES };
