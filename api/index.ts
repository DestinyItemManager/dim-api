import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import jwt from 'express-jwt';
import { authTokenHandler } from './routes/auth-token';
import { platformInfoHandler } from './routes/platform-info';
import { metrics } from './metrics';

const app = express();
const port = 3000;

app.use(metrics.helpers.getExpressMiddleware('http', { timeByUrl: true })); // metrics
app.use(morgan('combined')); // logging
app.use(cors()); // support CORS for all origins. TODO: for POST / include-credentials limit to only registered apps?
app.use(express.json()); // for parsing application/json

app.get('/', (_, res) => res.send('Hello from DIM!!!'));

app.post('/auth/token', authTokenHandler);
app.get('/platform_info', platformInfoHandler);

// Any routes declared below this will require an auth token
app.all('*', jwt({ secret: process.env.JWT_SECRET! }));

app.get('/test', (req, res) =>
  res.send(`Secret squirrel ${JSON.stringify((req as any).user)}`)
);

app.use((err, _req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    res.status(401).send({
      status: err.name,
      message: err.message
    });
  } else {
    next(err);
  }
});

metrics.increment('startup', 1);
app.listen(port, () => console.log(`DIM API started up on port ${port}`));
