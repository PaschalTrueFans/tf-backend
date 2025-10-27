import app from './app';
import { Server } from './src/helpers/env';
import { Logger } from './src/helpers/logger';
import http from 'http';
import { createSocketServer } from './src/realtime/socket';
import { internalOptions } from './src/helpers/cors';

const port: string | number = Server.PORT;

const httpServer = http.createServer(app);

createSocketServer(httpServer, (internalOptions as any).origin || '*');

httpServer.listen(port, () => {
  Logger.info('Server Running on http://localhost:' + port);
});
