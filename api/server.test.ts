import { readFile } from 'fs';
import jwt from 'jsonwebtoken';
import { makeFetch } from 'supertest-fetch';
import { promisify } from 'util';
import { v4 as uuid } from 'uuid';
import { refreshApps } from './apps/index.js';
import { closeDbPool } from './db/index.js';
import { app } from './server.js';
import { ApiApp } from './shapes/app.js';
import { DeleteAllResponse } from './shapes/delete-all.js';
import { ExportResponse } from './shapes/export.js';
import { PlatformInfoResponse } from './shapes/global-settings.js';
import { ImportResponse } from './shapes/import.js';
import { LoadoutShareRequest, LoadoutShareResponse } from './shapes/loadout-share.js';
import { Loadout, LoadoutItem } from './shapes/loadouts.js';
import { ProfileResponse, ProfileUpdateRequest, ProfileUpdateResponse } from './shapes/profile.js';
import { SearchType } from './shapes/search.js';
import { defaultSettings } from './shapes/settings.js';
import { client } from './stately/client.js';

const fetch = makeFetch(app);

const bungieMembershipId = 1234;
const platformMembershipId = '4611686018433092312';
let testApiKey: string;
let testUserToken: string;

beforeAll(async () => {
  const appResponse = await createApp();
  testApiKey = appResponse.dimApiKey;
  expect(testApiKey).toBeDefined();
  await refreshApps();

  testUserToken = jwt.sign(
    {
      profileIds: [platformMembershipId],
    },
    process.env.JWT_SECRET!,
    {
      subject: bungieMembershipId.toString(),
      issuer: testApiKey,
      expiresIn: 60 * 60,
    },
  );

  // Make sure we have global settings
  const globalSettings = ['dev', 'beta', 'app'].map((stage) =>
    client.create('GlobalSettings', {
      stage,
      dimApiEnabled: true,
      destinyProfileMinimumRefreshInterval: 15n,
      destinyProfileRefreshInterval: 120n,
      autoRefresh: true,
      refreshProfileOnVisible: true,
      dimProfileMinimumRefreshInterval: 600n,
      showIssueBanner: false,
    }),
  );
  await client.putBatch(...globalSettings);
});

afterAll(() => closeDbPool());

it('returns basic info from GET /', async () => {
  // Sends GET Request to / endpoint
  const response = await fetch('/');

  expect(response.status).toBe(200);
});

describe('platform_info', () => {
  it('returns global info from GET /platform_info', async () => {
    const response = (await fetch('/platform_info')
      .expect('Content-Type', /json/)
      .expect(200)
      .json()) as PlatformInfoResponse;

    const platformInfo = response.settings;

    expect(platformInfo.dimApiEnabled).toBe(true);
  });

  it('can return info from an unknown flavor', async () => {
    const response = (await fetch('/platform_info?flavor=foo')
      .expect('Content-Type', /json/)
      .expect(200)
      .json()) as PlatformInfoResponse;

    const platformInfo = response.settings;

    expect(platformInfo.dimApiEnabled).toBe(true);
  });
});

it('can create new apps idempotently', async () => {
  // Test that creating an app is idempotent
  const response = await createApp();

  // Same API Key
  expect(response.dimApiKey).toEqual(testApiKey);
});

describe('import/export', () => {
  it('can import and export data', async () => {
    await importData();

    const exportResponse = (await getRequestAuthed('/export').expect(200).json()) as ExportResponse;

    expect(exportResponse.settings.itemSortOrderCustom).toEqual([
      'sunset',
      'tag',
      'primStat',
      'season',
      'ammoType',
      'rarity',
      'typeName',
      'name',
    ]);

    expect(exportResponse.loadouts.length).toBe(37);
    expect(exportResponse.tags.length).toBe(592);
  });

  // TODO: other import formats, validation
});

describe('profile', () => {
  // Applies only to tests in this describe block
  beforeEach(importData);

  it('can retrieve all profile data', async () => {
    const profileResponse = (await getRequestAuthed(
      `/profile?components=settings,loadouts,tags,triumphs&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.settings!.itemSortOrderCustom).toEqual([
      'sunset',
      'tag',
      'primStat',
      'season',
      'ammoType',
      'rarity',
      'typeName',
      'name',
    ]);
    expect(profileResponse.loadouts!.length).toBe(19);
    expect(profileResponse.tags!.length).toBe(592);
    expect(profileResponse.triumphs!.length).toBe(30);
  });

  it('can retrieve only settings, without needing a platform membership ID', async () => {
    const profileResponse = (await getRequestAuthed('/profile?components=settings')
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.settings!.itemSortOrderCustom).toEqual([
      'sunset',
      'tag',
      'primStat',
      'season',
      'ammoType',
      'rarity',
      'typeName',
      'name',
    ]);
    expect(profileResponse.loadouts).toBeUndefined();
    expect(profileResponse.tags).toBeUndefined();
    expect(profileResponse.triumphs).toBeUndefined();
  });

  it('can retrieve only loadouts', async () => {
    const profileResponse = (await getRequestAuthed(
      `/profile?components=loadouts&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.settings).toBeUndefined();
    expect(profileResponse.loadouts!.length).toBe(19);
    expect(profileResponse.tags).toBeUndefined();
  });

  it('can delete all data with /delete_all_data', async () => {
    const response = (await postRequestAuthed('/delete_all_data')
      .expect(200)
      .json()) as DeleteAllResponse;

    expect(response.deleted).toEqual({
      itemHashTags: 71,
      loadouts: 37,
      searches: 205,
      settings: 1,
      tags: 592,
      triumphs: 30,
    });

    // Now re-export and make sure it's all gone
    const exportResponse = (await getRequestAuthed('/export').expect(200).json()) as ExportResponse;

    expect(Object.keys(exportResponse.settings).length).toBe(0);
    expect(exportResponse.loadouts.length).toBe(0);
    expect(exportResponse.tags.length).toBe(0);
  });
});

describe('settings', () => {
  beforeEach(() => postRequestAuthed('/delete_all_data').expect(200));

  it('returns default settings', async () => {
    const profileResponse = (await getRequestAuthed('/profile?components=settings')
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.settings).toEqual(defaultSettings);
  });

  it('can update a setting', async () => {
    const request: ProfileUpdateRequest = {
      updates: [
        {
          action: 'setting',
          payload: {
            showNewItems: true,
          },
        },
      ],
    };

    await postRequestAuthed('/profile', request).expect(200);

    // Read settings back
    const profileResponse = (await getRequestAuthed('/profile?components=settings')
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.settings?.showNewItems).toBe(true);
  });
});

const loadout: Loadout = {
  id: uuid(),
  name: 'Test Loadout',
  classType: 1,
  clearSpace: false,
  equipped: [
    {
      hash: 100,
      id: '1234',
      socketOverrides: { 7: 9 },
    },
  ],
  unequipped: [
    // This item has an extra property which shouldn't be saved
    {
      hash: 200,
      id: '5678',
      amount: 10,
      fizbuzz: 11,
    } as any as LoadoutItem,
  ],
};

describe('loadouts', () => {
  beforeEach(() => postRequestAuthed('/delete_all_data').expect(200));

  it('can add a loadout', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'loadout',
          payload: loadout,
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    // Read loadouts back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=loadouts&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.loadouts?.length).toBe(1);
    const resultLoadout = profileResponse.loadouts![0];
    expect(resultLoadout.id).toBe(loadout.id);
    expect(resultLoadout.name).toBe(loadout.name);
    expect(resultLoadout.classType).toBe(loadout.classType);
    expect(resultLoadout.equipped).toEqual(loadout.equipped);
    // This property should have been stripped
    expect((resultLoadout.unequipped[0] as { fizbuzz?: string }).fizbuzz).toBeUndefined();
  });

  it('can update a loadout', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'loadout',
          payload: loadout,
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    // Change name
    const request2: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'loadout',
          payload: { ...loadout, name: 'Updated Name' },
        },
      ],
    };

    const updateResult2 = (await postRequestAuthed('/profile', request2)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult2.results[0].status).toBe('Success');

    // Read loadouts back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=loadouts&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.loadouts?.length).toBe(1);
    expect(profileResponse.loadouts![0].name).toBe('Updated Name');
  });

  it('can delete a loadout', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'loadout',
          payload: loadout,
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    // Delete the loadout
    const request2: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'delete_loadout',
          payload: loadout.id,
        },
      ],
    };

    const updateResult2 = (await postRequestAuthed('/profile', request2)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult2.results[0].status).toBe('Success');

    // Read loadouts back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=loadouts&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.loadouts?.length).toBe(0);
  });
});

describe('tags', () => {
  beforeEach(() => postRequestAuthed('/delete_all_data').expect(200));

  it('can add a tag', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'tag',
          payload: {
            id: '1234',
            tag: 'favorite',
          },
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    // Read tags back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=tags&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.tags?.length).toBe(1);
    const resultTag = profileResponse.tags![0];
    expect(resultTag).toEqual({
      id: '1234',
      tag: 'favorite',
    });
  });

  it('can update a tag', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'tag',
          payload: {
            id: '12345',
            tag: 'favorite',
          },
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    // Change tag and notes
    const request2: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'tag',
          payload: {
            id: '12345',
            tag: 'junk',
            notes: 'super junky',
          },
        },
      ],
    };

    const updateResult2 = (await postRequestAuthed('/profile', request2)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult2.results[0].status).toBe('Success');

    // Read tags back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=tags&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.tags?.length).toBe(1);
    const resultTag = profileResponse.tags![0];
    expect(resultTag).toEqual({
      id: '12345',
      tag: 'junk',
      notes: 'super junky',
    });

    // Delete tag
    const request3: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'tag',
          payload: {
            id: '12345',
            tag: null,
          },
        },
      ],
    };

    const updateResult3 = (await postRequestAuthed('/profile', request3)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult3.results[0].status).toBe('Success');

    // Read tags back after deleting the tag
    const profileResponse2 = (await getRequestAuthed(
      `/profile?components=tags&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse2.tags?.length).toBe(1);
    const resultTag2 = profileResponse2.tags![0];
    expect(resultTag2).toEqual({
      id: '12345',
      notes: 'super junky',
    });
  });

  it('can delete a tag', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'tag',
          payload: {
            id: '1234567',
            tag: 'favorite',
            notes: 'the best',
          },
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    // delete tag and notes
    const request2: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'tag',
          payload: {
            id: '1234567',
            tag: null,
            notes: '',
          },
        },
      ],
    };

    const updateResult2 = (await postRequestAuthed('/profile', request2)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult2.results[0].status).toBe('Success');

    // Read tags back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=tags&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.tags?.length).toBe(0);
  });

  it('can clear tags', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'tag',
          payload: {
            id: '1234567',
            tag: 'favorite',
            notes: 'the best',
          },
        },
        {
          action: 'tag',
          payload: {
            id: '7654321',
            tag: 'junk',
            notes: 'the worst',
          },
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');
    expect(updateResult.results[1].status).toBe('Success');

    // cleanup tags by id
    const request2: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'tag_cleanup',
          payload: ['1234567', '7654321'],
        },
      ],
    };

    const updateResult2 = (await postRequestAuthed('/profile', request2)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult2.results[0].status).toBe('Success');

    // Read tags back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=tags&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.tags?.length).toBe(0);
  });
});

describe('item hash tags', () => {
  beforeEach(() => postRequestAuthed('/delete_all_data').expect(200));

  it('can add an item hash tag', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'item_hash_tag',
          payload: {
            hash: 1234,
            tag: 'favorite',
          },
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    // Read tags back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=hashtags&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.itemHashTags?.length).toBe(1);
    const resultTag = profileResponse.itemHashTags![0];
    expect(resultTag).toEqual({
      hash: 1234,
      tag: 'favorite',
    });
  });

  it('can update an item hash tag', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'item_hash_tag',
          payload: {
            hash: 1234,
            tag: 'favorite',
          },
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    // Change tag and notes
    const request2: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'item_hash_tag',
          payload: {
            hash: 1234,
            tag: 'junk',
            notes: 'super junky',
          },
        },
      ],
    };

    const updateResult2 = (await postRequestAuthed('/profile', request2)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult2.results[0].status).toBe('Success');

    // Read tags back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=hashtags&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.itemHashTags?.length).toBe(1);
    const resultTag = profileResponse.itemHashTags![0];
    expect(resultTag).toEqual({
      hash: 1234,
      tag: 'junk',
      notes: 'super junky',
    });

    // Delete tag
    const request3: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'item_hash_tag',
          payload: {
            hash: 1234,
            tag: null,
          },
        },
      ],
    };

    const updateResult3 = (await postRequestAuthed('/profile', request3)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult3.results[0].status).toBe('Success');

    // Read tags back after deleting the tag
    const profileResponse2 = (await getRequestAuthed(
      `/profile?components=hashtags&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse2.itemHashTags?.length).toBe(1);
    const resultTag2 = profileResponse2.itemHashTags![0];
    expect(resultTag2).toEqual({
      hash: 1234,
      notes: 'super junky',
    });
  });

  it('can delete an item hash tag', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'item_hash_tag',
          payload: {
            hash: 1234,
            tag: 'favorite',
            notes: 'the best',
          },
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    // delete tag and notes
    const request2: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'item_hash_tag',
          payload: {
            hash: 1234,
            tag: null,
            notes: '',
          },
        },
      ],
    };

    const updateResult2 = (await postRequestAuthed('/profile', request2)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult2.results[0].status).toBe('Success');

    // Read tags back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=tags&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.tags?.length).toBe(0);
  });
});

describe('triumphs', () => {
  beforeEach(() => postRequestAuthed('/delete_all_data').expect(200));

  it('can add a tracked triumph', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'track_triumph',
          payload: {
            recordHash: 1234,
            tracked: true,
          },
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    // Read tags back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=triumphs&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.triumphs?.length).toBe(1);
    expect(profileResponse.triumphs!).toEqual([1234]);
  });

  it('can remove a tracked triumph', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'track_triumph',
          payload: {
            recordHash: 1234,
            tracked: true,
          },
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    const request2: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'track_triumph',
          payload: {
            recordHash: 1234,
            tracked: false,
          },
        },
      ],
    };

    const updateResult2 = (await postRequestAuthed('/profile', request2)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    expect(updateResult2.results[0].status).toBe('Success');

    // Read tags back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=triumphs&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.triumphs?.length).toBe(0);
  });

  it('can set the same state twice', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'track_triumph',
          payload: {
            recordHash: 1234,
            tracked: true,
          },
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    const request2: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'track_triumph',
          payload: {
            recordHash: 1234,
            tracked: true,
          },
        },
      ],
    };

    const updateResult2 = (await postRequestAuthed('/profile', request2)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult2.results[0].status).toBe('Success');

    // Read tags back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=triumphs&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.triumphs?.length).toBe(1);
    expect(profileResponse.triumphs!).toEqual([1234]);
  });
});

describe('searches', () => {
  beforeEach(() => postRequestAuthed('/delete_all_data').expect(200));

  it('can add a recent search', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'search',
          payload: {
            query: 'tag:favorite',
            type: SearchType.Item,
          },
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    // Read tags back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=searches&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.searches?.filter((s) => s.usageCount > 0)?.length).toBe(1);
    expect(profileResponse.searches![0].query).toBe('tag:favorite');
    expect(profileResponse.searches![0].usageCount).toBe(1);
  });

  it('can save a search', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'search',
          payload: {
            query: 'tag:favorite',
            type: SearchType.Item,
          },
        },
        {
          action: 'save_search',
          payload: {
            query: 'tag:favorite',
            type: SearchType.Item,
            saved: true,
          },
        },
      ],
    };

    const updateResult = (await postRequestAuthed('/profile', request)
      .expect(200)
      .json()) as ProfileUpdateResponse;

    expect(updateResult.results[0].status).toBe('Success');

    // Read tags back
    const profileResponse = (await getRequestAuthed(
      `/profile?components=searches&platformMembershipId=${platformMembershipId}`,
    )
      .expect(200)
      .json()) as ProfileResponse;

    expect(profileResponse.searches?.filter((s) => s.usageCount > 0)?.length).toBe(1);
    expect(profileResponse.searches![0].query).toBe('tag:favorite');
    expect(profileResponse.searches![0].saved).toBe(true);
    expect(profileResponse.searches![0].usageCount).toBe(1);
  });
});

describe('loadouts', () => {
  it('can share a loadout', async () => {
    const request: LoadoutShareRequest = {
      platformMembershipId,
      loadout,
    };

    const updateResult = (await postRequestAuthed('/loadout_share', request)
      .expect(200)
      .json()) as LoadoutShareResponse;

    expect(updateResult.shareUrl).toMatch(/https:\/\/dim.gg\/[a-z0-9]{7}\/Test-Loadout/);
  });
});

async function createApp() {
  const response = (await fetch('/new_app', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      id: 'test-app',
      bungieApiKey: 'test-api-key',
      origin: 'https://localhost:8080',
    }),
  })
    .expect('Content-Type', /json/)
    .expect(200)
    .json()) as { app: ApiApp };

  expect(response.app.dimApiKey).toBeDefined();

  return response.app;
}

async function importData() {
  const file = JSON.parse(
    (await promisify(readFile)('./dim-data.json')).toString(),
  ) as ExportResponse;

  const resp = (await postRequestAuthed('/import', file).expect(200).json()) as ImportResponse;
  expect(resp.tags).toBeGreaterThan(1);

  return file;
}

function getRequestAuthed(url: string) {
  return fetch(url, {
    headers: {
      'X-API-Key': testApiKey,
      Authorization: `Bearer ${testUserToken}`,
    },
  }).expect('Content-Type', /json/);
}

function postRequestAuthed(url: string, body?: any) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'X-API-Key': testApiKey,
      Authorization: `Bearer ${testUserToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  }).expect('Content-Type', /json/);
}
