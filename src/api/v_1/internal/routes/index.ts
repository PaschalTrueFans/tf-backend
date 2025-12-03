import * as express from 'express';
import cors from 'cors';
import { Logger } from '../../../../helpers/logger';
import { internalOptions } from '../../../../helpers/cors';
import { LinkInBioController } from '../controller/link-in-bio.controller';

import fileUpload from 'express-fileupload';
import { commonRoutes } from './common.routes';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { chatRoutes } from './chat.routes';
import { adminRoutes } from './admin.routes';
import { linkInBioRoutes } from './link-in-bio.routes';
import webhookRoutes from './webhook.routes';

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
    // Webhook routes need raw body, so they come before JSON parsing
    this.router.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);
    this.router.use(express.json({ limit: '200mb' }));
    this.router.use(fileUpload());
  }

  private InitApiRoutes(): void {
    this.router.use('/common', commonRoutes);
    this.router.use('/auth', authRoutes);
    this.router.use('/user', userRoutes);
    this.router.use('/user/chat', chatRoutes);
    this.router.use('/admin', adminRoutes);
    this.router.use('/link-in-bio', linkInBioRoutes);

    // Public link-in-bio route alias
    const linkInBioController = new LinkInBioController();
    this.router.get('/:username/links', linkInBioController.getPublicProfile);

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
