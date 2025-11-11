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

  public getTickets = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = (req.query.search as string) || undefined;
      const statusQuery = (req.query.status as string)?.toLowerCase();

      const status =
        statusQuery && ['open', 'in_progress', 'completed'].includes(statusQuery)
          ? (statusQuery as 'open' | 'in_progress' | 'completed')
          : undefined;

      const response = await service.GetTickets({ page, limit, search, status });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }

    res.json(body);
  };

  public addTicketComment = async (
    req: RequestBody<{ comment: string }>,
    res: Response,
  ): Promise<void> => {
    let body;
    try {
      const { ticketId } = req.params;
      const { comment } = req.body;
      const adminId = (req.userId as string) || null;

      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.AddTicketComment({ ticketId, adminId, comment });

      body = {
        data: response,
      };
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

  public updateTicketStatus = async (
    req: RequestBody<{ status: string }>,
    res: Response,
  ): Promise<void> => {
    let body;
    try {
      const { ticketId } = req.params;
      const rawStatus = (req.body?.status || '').toString().toLowerCase();

      const status =
        rawStatus && ['open', 'in_progress', 'completed'].includes(rawStatus)
          ? (rawStatus as 'open' | 'in_progress' | 'completed')
          : undefined;

      if (!status) {
        throw new AppError(400, 'Valid status is required');
      }

      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.UpdateTicketStatus(ticketId, status);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
      return;
    }

    res.json(body);
  };

  public getSystemNotifications = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = (req.query.search as string) || undefined;

      const response = await service.GetSystemNotifications({ page, limit, search });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }

    res.json(body);
  };

  public createSystemNotification = async (
    req: RequestBody<{ title: string; message: string }>,
    res: Response,
  ): Promise<void> => {
    let body;
    try {
      const { title, message } = req.body ?? {};
      const adminId = (req.userId as string) || null;

      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.CreateSystemNotification(adminId, { title, message });
      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
      return;
    }

    res.status(201).json(body);
  };

  public updateSystemNotification = async (
    req: RequestBody<{ title?: string; message?: string }>,
    res: Response,
  ): Promise<void> => {
    let body;
    try {
      const { notificationId } = req.params;
      const { title, message } = req.body ?? {};

      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.UpdateSystemNotification(notificationId, { title, message });
      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
      return;
    }

    res.json(body);
  };

  public deleteSystemNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { notificationId } = req.params;

      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.DeleteSystemNotification(notificationId);

      res.status(204).send();
    } catch (error) {
      genericError(error, res);
    }
  };

  public getEmailBroadcasts = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = (req.query.search as string) || undefined;

      const response = await service.GetEmailBroadcasts({ page, limit, search });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }

    res.json(body);
  };

  public createEmailBroadcast = async (
    req: RequestBody<{ subject: string; message: string }>,
    res: Response,
  ): Promise<void> => {
    let body;
    try {
      const { subject, message } = req.body ?? {};
      const adminId = (req.userId as string) || null;

      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.CreateEmailBroadcast(adminId, { subject, message });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }

    res.status(201).json(body);
  };

  public getSettings = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.GetSettings();
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public updateSettings = async (
    req: RequestBody<{ platformFee: string }>,
    res: Response,
  ): Promise<void> => {
    let body;
    try {
      const { platformFee } = req.body ?? {};

      if (!platformFee || typeof platformFee !== 'string') {
        throw new AppError(400, 'platformFee is required and must be a string');
      }

      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.UpdateSettings(platformFee);
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };
}

