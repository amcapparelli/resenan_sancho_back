'use strict';
const logger = require('./logger');

const GRAPH_VERSION = 'v26.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const STATUS_ATTEMPTS = 10;
const STATUS_DELAY_MS = 3000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Meta answers errors with { error: { message, code, error_subcode } }. The
// message is surfaced in full (it is what makes a failure debuggable) but the
// access token never leaves this module.
async function graphRequest(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.error) {
    const error = body.error || {};
    throw new Error(`Graph API ${response.status}: ${error.message || 'unknown error'}${error.code ? ` (code ${error.code})` : ''}`);
  }
  return body;
}

async function createMediaContainer({ igUserId, accessToken, imageUrl, caption }) {
  const body = new URLSearchParams({ image_url: imageUrl, caption, access_token: accessToken });
  const result = await graphRequest(`${BASE_URL}/${igUserId}/media`, { method: 'POST', body });

  if (!result.id) {
    throw new Error('Graph API did not return a container id');
  }
  return result.id;
}

// Instagram processes the container asynchronously; publishing one that is not
// FINISHED fails, so poll with a short backoff and give up rather than force it.
async function waitForContainer({ containerId, accessToken, attempts = STATUS_ATTEMPTS, delayMs = STATUS_DELAY_MS }) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const url = `${BASE_URL}/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`;
    const { status_code: statusCode } = await graphRequest(url, { method: 'GET' });

    if (statusCode === 'FINISHED') {
      return;
    }
    if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
      throw new Error(`container ${containerId} ended in status ${statusCode}`);
    }
    logger.debug('container not ready yet', { containerId, statusCode, attempt });
    if (attempt < attempts) {
      await wait(delayMs);
    }
  }
  throw new Error(`container ${containerId} was not FINISHED after ${attempts} attempts`);
}

async function publishContainer({ igUserId, accessToken, containerId }) {
  const body = new URLSearchParams({ creation_id: containerId, access_token: accessToken });
  const result = await graphRequest(`${BASE_URL}/${igUserId}/media_publish`, { method: 'POST', body });
  return result.id;
}

module.exports = { createMediaContainer, waitForContainer, publishContainer, GRAPH_VERSION };
