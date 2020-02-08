import { app } from './server';
import { metrics } from './metrics';

const port = 3000;

metrics.increment('startup', 1);
app.listen(port, () => console.log(`DIM API started up on port ${port}`));
