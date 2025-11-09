import * as express from 'express';
import { Response, Request } from 'express';
import { Db } from '../../../../database/db';
import { Logger } from '../../../../helpers/logger';
import { genericError } from '../../../../helpers/utils';
import { AdminService } from '../services/admin.service';

export class AdminController {
  constructor() {
    Logger.info('Admin controller initialized...');
  }

  // Get dashboard overview
  public getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });
      const response = await service.GetDashboardOverview();

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };
}

