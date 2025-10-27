import * as express from 'express';
import cors from 'cors';
import { Logger } from '../../../../helpers/logger';
import { internalOptions } from '../../../../helpers/cors';

import fileUpload from 'express-fileupload';
import { commonRoutes } from './common.routes';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { chatRoutes } from './chat.routes';

export class ApiRouter {
  public router: express.Router;

  constructor() {
    Logger.info('Initializing API Routes');
    this.router = express.Router();
    this.InitMiddleWares();
    this.InitApiRoutes();
    Logger.info('API routes initialize successfully!');
  }

  private InitMiddleWares(): void {
    this.router.use(cors(internalOptions));
    this.router.use(express.json({ limit: '200mb' }));
    this.router.use(fileUpload());
  }

  private InitApiRoutes(): void {
    this.router.use('/common', commonRoutes);
    this.router.use('/auth', authRoutes);
    this.router.use('/user', userRoutes);
    this.router.use('/user/chat', chatRoutes);

    this.router.use('*', (req: express.Request, res: express.Response): express.Response => {
      try {
        throw `the Endpoint ${req.originalUrl} with the method ${req.method} Is not hosted on our server!`;
      } catch (error) {
        Logger.error(error);
        return res.status(500).json({ msg: 'Internal server error' });
      }
    });
  }
}
