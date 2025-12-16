import app from './app';
import { Server } from './src/helpers/env';
import { Logger } from './src/helpers/logger';
import http from 'http';
import { createSocketServer } from './src/realtime/socket';
import { internalOptions } from './src/helpers/cors';

import { Db } from './src/database/db';

import { SeedsController } from './src/seeds/seeds.controller';

const port: string | number = Server.PORT;

const httpServer = http.createServer(app);

createSocketServer(httpServer, (internalOptions as any).origin || '*');

Db.Instance.Init().then(async () => {
  Logger.info('Database connected. Initializing seeds...');
  const seeds = new SeedsController();
  await seeds.initSeeds();
  Logger.info('Seeds initialized.');

  httpServer.listen(port, () => {
    Logger.info('Server Running on http://localhost:' + port);
  });
}).catch((err) => {
  Logger.error('Failed to connect to database', err);
  process.exit(1);
});
