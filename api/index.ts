import express from 'express';
import morgan from 'morgan';
import jwt from 'express-jwt';
import { authTokenHandler } from './routes/auth-token';
import { platformInfoHandler } from './routes/platform-info';
import { metrics } from './metrics';

const app = express();
const port = 3000;

app.use(metrics.helpers.getExpressMiddleware('http', { timeByUrl: true }));
app.use(morgan('combined'));
app.use(express.json()); // for parsing application/json
app.use(function(err, _req, res, _next) {
  if (err.name === 'UnauthorizedError') {
    res.status(401).send({
      status: 'Unauthorized',
      message: 'invalid auth token'
    });
  }
});

app.get('/', (_, res) => res.send('Hello from DIM!!!'));

app.post('/auth/token', authTokenHandler);
app.get('/platform_info', platformInfoHandler);

// Any routes declared below this will require an auth token
app.all('*', jwt({ secret: process.env.JWT_SECRET! }));

app.get('/test', (req, res) =>
  res.send(`Secret squirrel ${JSON.stringify(req.user)}`)
);

metrics.increment('startup', 1);
app.listen(port, () => console.log(`DIM API started up on port ${port}`));
