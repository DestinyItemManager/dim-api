import asyncHandler from 'express-async-handler';
import superagent from 'superagent';

const donationUrl = 'https://bungiefoundation.donordrive.com/api/1.3/participants/22881';

// Temporary proxy for donor drive API
export const donateHandler = asyncHandler(async (_req, res) => {
  try {
    const response = await superagent.get(donationUrl);
    if (response.statusCode >= 400) {
      throw new Error(`Got status code ${response.statusCode}`);
    }
    // Cache successful responses for 15 minutes in CF
    res.set('Cache-Control', 'max-age=900');
    res.send(response.body);
  } catch (e) {
    res.set('Cache-Control', 'max-age=60');
    res.status(500);
    res.send(e.message);
  }
});
