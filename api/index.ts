import express from 'express';
import { authTokenHandler } from './routes/auth-token';

const app = express();
const port = 3000;

app.use(express.json()); // for parsing application/json

app.get('/', (_, res) => res.send('Hello from DIM!!!'));

app.post('/auth/token', authTokenHandler);

app.listen(port, () => console.log(`DIM API listening on port ${port}!`));
