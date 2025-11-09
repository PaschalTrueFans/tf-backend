import * as express from 'express';
import { Response, Request } from 'express';
import { Db } from '../../../../database/db';
import { Logger } from '../../../../helpers/logger';
import { genericError, RequestBody } from '../../../../helpers/utils';
import { AdminService } from '../services/admin.service';
import { AppError } from '../../../../helpers/errors';

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

  public getUsers = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = (req.query.search as string) || undefined;
      const roleQuery = (req.query.role as string)?.toLowerCase();
      const isBlockedQuery = (req.query.isBlocked as string)?.toLowerCase();

      const role = roleQuery === 'creator' || roleQuery === 'member' ? (roleQuery as 'creator' | 'member') : undefined;
      const isBlocked = isBlockedQuery === 'true' ? true : false;

      const response = await service.GetUsers({ page, limit, search, role, isBlocked });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getTransactions = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = (req.query.search as string) || undefined;
      const status = (req.query.status as string) || undefined;

      const response = await service.GetTransactions({ page, limit, search, status });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }

    res.json(body);
  };

  public updateUserBlockStatus = async (req: RequestBody<{ isBlocked: boolean }>, res: Response): Promise<void> => {
    let body;
    try {
      const { userId } = req.params;
      const { isBlocked } = req.body as { isBlocked?: boolean };

      if (typeof isBlocked !== 'boolean') {
        throw new AppError(400, 'isBlocked must be a boolean');
      }

      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.UpdateUserBlockStatus(userId, isBlocked);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };
}

