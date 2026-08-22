'use strict';

// Every value is read at call time, never at module load: that way the feature
// can be switched off (or moved out of dry-run) by changing a Heroku config var
// without a redeploy.
function readFlag(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value === 'true';
}

function getConfig() {
  return {
    enabled: readFlag('SOCIAL_AUTOPOST_ENABLED', false),
    // Dry-run is the safe default: a missing/typo'd config var must never end up
    // publishing to the real account.
    dryRun: readFlag('IG_DRY_RUN', true),
    accessToken: process.env.IG_PAGE_ACCESS_TOKEN,
    businessAccountId: process.env.IG_BUSINESS_ACCOUNT_ID,
  };
}

module.exports = { getConfig };
