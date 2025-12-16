import express from 'express';
import { Logger } from './src/helpers/logger';
import { Swagger } from './src/helpers/env';
import helmet from 'helmet';
import xss from 'xss-clean';
import SwaggerUI from 'swagger-ui-express';
import SwaggerDocs from './swagger.json';
import { Db } from './src/database/db';
import { SeedsController } from './src/seeds/seeds.controller';
import { ApiRouter } from './src/api/v_1/internal/routes';

class App {
  constructor() {
    this.app = express();
    this.middlewares();

    this.routes();
  }
  public app: express.Application;

  private middlewares(): void {
    Logger.info('Middlewares are being initialized...');

    this.app.use(xss());
    this.app.use(helmet());

    this.app.use(Swagger.PATH + '/v_1', SwaggerUI.serve, SwaggerUI.setup(SwaggerDocs));

    this.app.use((req, res, next) => {
      // Use the singleton Db instance, don't create a new one per request
      // MongoDB connections should persist throughout the app lifecycle
      res.locals.db = Db.Instance;
      next();
    });
    Logger.info('Middlewares are initialized successfully...');
  }



  private routes(): void {
    Logger.info('Routes are being initialized...');

    this.app.use(`/api/v_1/internal`, new ApiRouter().router);

    this.app.use(`*`, (req, res) => {
      res.status(404).json({ message: 'Route not Found' });
    });

    Logger.info('Routes initialized successfully...');
  }
}
export default new App().app;
