import { client } from '../client.js';

const devSettings = client.create('GlobalSettings', {
  stage: 'dev',
  dimApiEnabled: true,
  destinyProfileMinimumRefreshInterval: 15n,
  destinyProfileRefreshInterval: 120n,
  autoRefresh: true,
  refreshProfileOnVisible: true,
  dimProfileMinimumRefreshInterval: 1n,
  showIssueBanner: false,
});

const betaSettings = client.create('GlobalSettings', {
  stage: 'beta',
  dimApiEnabled: true,
  destinyProfileMinimumRefreshInterval: 15n,
  destinyProfileRefreshInterval: 120n,
  autoRefresh: true,
  refreshProfileOnVisible: true,
  dimProfileMinimumRefreshInterval: 1n,
  showIssueBanner: false,
});

const prodSettings = client.create('GlobalSettings', {
  stage: 'app',
  dimApiEnabled: true,
  destinyProfileMinimumRefreshInterval: 15n,
  destinyProfileRefreshInterval: 120n,
  autoRefresh: true,
  refreshProfileOnVisible: true,
  dimProfileMinimumRefreshInterval: 1n,
  showIssueBanner: false,
});

await client.putBatch(devSettings, betaSettings, prodSettings);

console.log('Global settings initialized');
// This is due to a bug in Connect!
process.exit(0);
