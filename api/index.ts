import express from 'express';
import morgan from 'morgan';
import { authTokenHandler } from './routes/auth-token';
import { platformInfoHandler } from './routes/platform-info';
import { metrics } from './metrics';

const app = express();
const port = 3000;

app.use(metrics.helpers.getExpressMiddleware('http', { timeByUrl: true }));
app.use(morgan('combined'));
app.use(express.json()); // for parsing application/json

app.get('/', (_, res) => res.send('Hello from DIM!!!'));

app.post('/auth/token', authTokenHandler);
app.get('/platform_info', platformInfoHandler);

metrics.increment('startup', 1);
app.listen(port, () => console.log(`DIM API started up!`));
