import asyncHandler from 'express-async-handler';

const donationUrl = 'https://bungiefoundation.donordrive.com/api/1.3/participants/22881';

// Temporary proxy for donor drive API
export const donateHandler = asyncHandler(async (_req, res) => {
  try {
    const response = await fetch(donationUrl);
    if (response.status >= 400) {
      throw new Error(`Got status code ${response.status}`);
    }
    // Cache successful responses for 15 minutes in CF
    res.set('Cache-Control', 'max-age=900');
    res.send(await response.text());
  } catch (e) {
    res.set('Cache-Control', 'max-age=60');
    res.status(500);
    if (e instanceof Error) {
      res.send(e.message);
    } else {
      res.send(`Unknown error: ${e as string}`);
    }
  }
});
