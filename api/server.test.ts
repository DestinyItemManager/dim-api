import { app } from './server';
import { readFile } from 'fs';
import { promisify } from 'util';
import supertest from 'supertest';
import { sign } from 'jsonwebtoken';
import { ExportResponse } from './shapes/export';
import { ProfileResponse, ProfileUpdateRequest } from './shapes/profile';
import { GlobalSettings } from './routes/platform-info';
import _ from 'lodash';
import { defaultSettings } from './shapes/settings';
import uuid from 'uuid/v4';
import { LoadoutItem, Loadout } from './shapes/loadouts';

const request = supertest(app);

const bungieMembershipId = 1234;
const platformMembershipId = '4611686018433092312';
let testApiKey;
let testUserToken;

beforeAll(async () => {
  const appResponse = await createApp();
  testApiKey = appResponse.body.app.dimApiKey;
  expect(testApiKey).toBeDefined();

  testUserToken = sign({}, process.env.JWT_SECRET!, {
    subject: bungieMembershipId.toString(),
    issuer: testApiKey,
    expiresIn: 60 * 60
  });
});

it('returns basic info from GET /', async () => {
  // Sends GET Request to / endpoint
  const response = await request.get('/');

  expect(response.status).toBe(200);
});

it('returns global info from GET /platform_info', async () => {
  const response = await request
    .get('/platform_info')
    .expect('Content-Type', /json/)
    .expect(200);

  const platformInfo = response.body.settings as GlobalSettings;

  expect(platformInfo.dimApiEnabled).toBe(true);
});

it('can create new apps idempotently', async () => {
  // Test that creating an app is idempotent
  const response = await createApp();

  // Same API Key
  expect(response.body.app.dimApiKey).toEqual(testApiKey);
});

describe('import/export', () => {
  it('can import and export data', async () => {
    await importData();

    const response = await getRequestAuthed('/export').expect(200);

    const exportResponse = response.body as ExportResponse;

    expect(exportResponse.settings.itemSortOrderCustom).toEqual([
      'tag',
      'rarity',
      'primStat',
      'typeName',
      'name'
    ]);

    expect(exportResponse.loadouts.length).toBe(12);
    expect(exportResponse.tags.length).toBe(51);
  });

  // TODO: other import formats, validation
});

describe('profile', () => {
  // Applies only to tests in this describe block
  beforeEach(async () => {
    await importData();
  });

  it('can retrieve all profile data', async () => {
    const response = await getRequestAuthed(
      `/profile?components=settings,loadouts,tags&platformMembershipId=${platformMembershipId}`
    ).expect(200);

    const profileResponse = response.body as ProfileResponse;

    expect(profileResponse.settings!.itemSortOrderCustom).toEqual([
      'tag',
      'rarity',
      'primStat',
      'typeName',
      'name'
    ]);
    expect(profileResponse.loadouts!.length).toBe(11);
    expect(profileResponse.tags!.length).toBe(51);
  });

  it('can retrieve only settings, without needing a platform membership ID', async () => {
    const response = await getRequestAuthed(
      '/profile?components=settings'
    ).expect(200);

    const profileResponse = response.body as ProfileResponse;

    expect(profileResponse.settings!.itemSortOrderCustom).toEqual([
      'tag',
      'rarity',
      'primStat',
      'typeName',
      'name'
    ]);
    expect(profileResponse.loadouts).toBeUndefined();
    expect(profileResponse.tags).toBeUndefined();
  });

  it('can retrieve only loadouts', async () => {
    const response = await getRequestAuthed(
      `/profile?components=loadouts&platformMembershipId=${platformMembershipId}`
    ).expect(200);

    const profileResponse = response.body as ProfileResponse;

    expect(profileResponse.settings).toBeUndefined();
    expect(profileResponse.loadouts!.length).toBe(11);
    expect(profileResponse.tags).toBeUndefined();
  });

  it('can delete all data with /delete_all_data', async () => {
    const response = await postRequestAuthed('/delete_all_data').expect(200);

    expect(response.body.deleted).toEqual({
      settings: 1,
      loadouts: 12,
      tags: 51
    });

    // Now re-export and make sure it's all gone
    const exported = await getRequestAuthed('/export').expect(200);

    const exportResponse = exported.body as ExportResponse;

    expect(_.size(exportResponse.settings)).toBe(0);
    expect(exportResponse.loadouts.length).toBe(0);
    expect(exportResponse.tags.length).toBe(0);
  });
});

describe('settings', () => {
  beforeEach(async () => {
    await postRequestAuthed('/delete_all_data').expect(200);
  });

  it('returns default settings', async () => {
    const response = await getRequestAuthed(
      '/profile?components=settings'
    ).expect(200);

    const profileResponse = response.body as ProfileResponse;

    expect(profileResponse.settings).toEqual(defaultSettings);
  });

  it('can update a setting', async () => {
    const request: ProfileUpdateRequest = {
      updates: [
        {
          action: 'setting',
          payload: {
            showNewItems: true
          }
        }
      ]
    };

    await postRequestAuthed('/profile')
      .send(request)
      .expect(200);

    // Read settings back
    const response = await getRequestAuthed(
      '/profile?components=settings'
    ).expect(200);

    const profileResponse = response.body as ProfileResponse;

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
      id: '1234'
    }
  ],
  unequipped: [
    // This item has an extra property which shouldn't be saved
    ({
      hash: 200,
      id: '5678',
      amount: 10,
      fizbuzz: 11
    } as any) as LoadoutItem
  ]
};

describe('loadouts', () => {
  beforeEach(async () => {
    await postRequestAuthed('/delete_all_data').expect(200);
  });

  it('can add a loadout', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'loadout',
          payload: loadout
        }
      ]
    };

    const updateResult = await postRequestAuthed('/profile')
      .send(request)
      .expect(200);

    expect(updateResult.body.results[0].status).toBe('Success');

    // Read loadouts back
    const response = await getRequestAuthed(
      `/profile?components=loadouts&platformMembershipId=${platformMembershipId}`
    ).expect(200);

    const profileResponse = response.body as ProfileResponse;

    expect(profileResponse.loadouts?.length).toBe(1);
    const resultLoadout = profileResponse.loadouts![0];
    expect(resultLoadout.id).toBe(loadout.id);
    expect(resultLoadout.name).toBe(loadout.name);
    expect(resultLoadout.classType).toBe(loadout.classType);
    expect(resultLoadout.clearSpace).toBe(loadout.clearSpace);
    expect(resultLoadout.equipped).toEqual(loadout.equipped);
    // This property should have been stripped
    expect((resultLoadout.unequipped[0] as any).fizbuzz).toBeUndefined();
  });

  it('can update a loadout', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'loadout',
          payload: loadout
        }
      ]
    };

    const updateResult = await postRequestAuthed('/profile')
      .send(request)
      .expect(200);

    expect(updateResult.body.results[0].status).toBe('Success');

    // Change name
    const request2: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'loadout',
          payload: { ...loadout, name: 'Updated Name' }
        }
      ]
    };

    const updateResult2 = await postRequestAuthed('/profile')
      .send(request2)
      .expect(200);

    expect(updateResult2.body.results[0].status).toBe('Success');

    // Read loadouts back
    const response = await getRequestAuthed(
      `/profile?components=loadouts&platformMembershipId=${platformMembershipId}`
    ).expect(200);

    const profileResponse = response.body as ProfileResponse;

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
          payload: loadout
        }
      ]
    };

    const updateResult = await postRequestAuthed('/profile')
      .send(request)
      .expect(200);

    expect(updateResult.body.results[0].status).toBe('Success');

    // Delete the loadout
    const request2: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'delete_loadout',
          payload: loadout.id
        }
      ]
    };

    const updateResult2 = await postRequestAuthed('/profile')
      .send(request2)
      .expect(200);

    expect(updateResult2.body.results[0].status).toBe('Success');

    // Read loadouts back
    const response = await getRequestAuthed(
      `/profile?components=loadouts&platformMembershipId=${platformMembershipId}`
    ).expect(200);

    const profileResponse = response.body as ProfileResponse;

    expect(profileResponse.loadouts?.length).toBe(0);
  });
});

describe('tags', () => {
  beforeEach(async () => {
    await postRequestAuthed('/delete_all_data').expect(200);
  });

  it('can add a tag', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'tag',
          payload: {
            id: '1234',
            tag: 'favorite'
          }
        }
      ]
    };

    const updateResult = await postRequestAuthed('/profile')
      .send(request)
      .expect(200);

    expect(updateResult.body.results[0].status).toBe('Success');

    // Read tags back
    const response = await getRequestAuthed(
      `/profile?components=tags&platformMembershipId=${platformMembershipId}`
    ).expect(200);

    const profileResponse = response.body as ProfileResponse;

    expect(profileResponse.tags?.length).toBe(1);
    const resultTag = profileResponse.tags![0];
    expect(resultTag).toEqual({
      id: '1234',
      tag: 'favorite'
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
            tag: 'favorite'
          }
        }
      ]
    };

    const updateResult = await postRequestAuthed('/profile')
      .send(request)
      .expect(200);

    expect(updateResult.body.results[0].status).toBe('Success');

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
            notes: 'super junky'
          }
        }
      ]
    };

    const updateResult2 = await postRequestAuthed('/profile')
      .send(request2)
      .expect(200);

    expect(updateResult2.body.results[0].status).toBe('Success');

    // Read tags back
    const response = await getRequestAuthed(
      `/profile?components=tags&platformMembershipId=${platformMembershipId}`
    ).expect(200);

    const profileResponse = response.body as ProfileResponse;

    expect(profileResponse.tags?.length).toBe(1);
    const resultTag = profileResponse.tags![0];
    expect(resultTag).toEqual({
      id: '12345',
      tag: 'junk',
      notes: 'super junky'
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
            tag: null
          }
        }
      ]
    };

    const updateResult3 = await postRequestAuthed('/profile')
      .send(request3)
      .expect(200);

    expect(updateResult3.body.results[0].status).toBe('Success');

    // Read tags back after deleting the tag
    const response2 = await getRequestAuthed(
      `/profile?components=tags&platformMembershipId=${platformMembershipId}`
    ).expect(200);

    const profileResponse2 = response2.body as ProfileResponse;

    expect(profileResponse2.tags?.length).toBe(1);
    const resultTag2 = profileResponse2.tags![0];
    expect(resultTag2).toEqual({
      id: '12345',
      notes: 'super junky'
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
            notes: 'the best'
          }
        }
      ]
    };

    const updateResult = await postRequestAuthed('/profile')
      .send(request)
      .expect(200);

    expect(updateResult.body.results[0].status).toBe('Success');

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
            notes: ''
          }
        }
      ]
    };

    const updateResult2 = await postRequestAuthed('/profile')
      .send(request2)
      .expect(200);

    expect(updateResult2.body.results[0].status).toBe('Success');

    // Read tags back
    const response = await getRequestAuthed(
      `/profile?components=tags&platformMembershipId=${platformMembershipId}`
    ).expect(200);

    const profileResponse = response.body as ProfileResponse;

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
            notes: 'the best'
          }
        },
        {
          action: 'tag',
          payload: {
            id: '7654321',
            tag: 'junk',
            notes: 'the worst'
          }
        }
      ]
    };

    const updateResult = await postRequestAuthed('/profile')
      .send(request)
      .expect(200);

    expect(updateResult.body.results[0].status).toBe('Success');
    expect(updateResult.body.results[1].status).toBe('Success');

    // cleanup tags by id
    const request2: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'tag_cleanup',
          payload: ['1234567', '7654321']
        }
      ]
    };

    const updateResult2 = await postRequestAuthed('/profile')
      .send(request2)
      .expect(200);

    expect(updateResult2.body.results[0].status).toBe('Success');

    // Read tags back
    const response = await getRequestAuthed(
      `/profile?components=tags&platformMembershipId=${platformMembershipId}`
    ).expect(200);

    const profileResponse = response.body as ProfileResponse;

    expect(profileResponse.tags?.length).toBe(0);
  });
});

describe('audit', () => {
  it('records info about a loadout', async () => {
    const request: ProfileUpdateRequest = {
      platformMembershipId,
      destinyVersion: 2,
      updates: [
        {
          action: 'loadout',
          payload: loadout
        }
      ]
    };

    const updateResult = await postRequestAuthed('/profile')
      .send(request)
      .expect(200);

    expect(updateResult.body.results[0].status).toBe('Success');

    const auditResult = await getRequestAuthed('/audit').expect(200);

    const expectedEntry = {
      createdAt: auditResult.body.log[0].createdAt,
      createdBy: 'settings-queries-test-app',
      destinyVersion: 2,
      payload: {},
      platformMembershipId: '213512057',
      type: 'tag_cleanup'
    };
    expect(auditResult.body.log[0]).toEqual(expectedEntry);
  });
});

async function createApp() {
  const response = await request
    .post('/new_app')
    .send({
      id: 'test-app',
      bungieApiKey: 'test-api-key',
      origin: 'https://localhost:8080'
    })
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.app.dimApiKey).toBeDefined();

  return response;
}

async function importData() {
  const file = JSON.parse(
    (await promisify(readFile)('./dim-data.json')).toString()
  );

  await postRequestAuthed('/import')
    .send(file)
    .expect(200);

  return file;
}

function getRequestAuthed(url: string) {
  return request
    .get(url)
    .set('X-API-Key', testApiKey)
    .set('Authorization', `Bearer ${testUserToken}`)
    .expect('Content-Type', /json/);
}

function postRequestAuthed(url: string) {
  return request
    .post(url)
    .set('X-API-Key', testApiKey)
    .set('Authorization', `Bearer ${testUserToken}`)
    .expect('Content-Type', /json/);
}
