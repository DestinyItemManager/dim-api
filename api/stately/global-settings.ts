import { MessageInitShape } from '@bufbuild/protobuf';
import { keyPath } from '@stately-cloud/client';
import { GlobalSettings } from '../shapes/global-settings.js';
import { client } from './client.js';
import { GlobalSettingsSchema } from './generated/index.js';
import { bigIntToNumber, stripTypeName } from './stately-utils.js';

function keyFor(flavor: string) {
  return keyPath`/gs-${flavor}`;
}

export async function getGlobalSettings(flavor: string): Promise<GlobalSettings | undefined> {
  const statelySettings = await client
    .withAllowStale(true)
    .withTimeoutMs(500)
    .get('GlobalSettings', keyFor(flavor));
  if (statelySettings) {
    return stripTypeName(bigIntToNumber(statelySettings));
  }
}

export async function updateGlobalSettings(
  settings: MessageInitShape<typeof GlobalSettingsSchema>,
): Promise<void> {
  await client.put(client.create('GlobalSettings', settings));
}
