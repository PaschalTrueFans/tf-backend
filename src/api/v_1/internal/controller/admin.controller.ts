import * as express from 'express';
import { Response, Request } from 'express';
import { Db } from '../../../../database/db';
import { Logger } from '../../../../helpers/logger';
import { genericError, RequestBody } from '../../../../helpers/utils';
import { AdminService } from '../services/admin.service';
import { AppError } from '../../../../helpers/errors';
import * as AdminModel from '../models/admin.model';

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

  public getUserDetails = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { userId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.GetUserDetails(userId);
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public updateUserDetails = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { userId } = req.params;
      const updateData = req.body;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.UpdateUserDetails(userId, updateData);
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public updateUserStatus = async (
    req: RequestBody<{ status: 'ban' | 'suspend' | 'activate' }>,
    res: Response,
  ): Promise<void> => {
    let body;
    try {
      const { userId } = req.params;
      const { status } = req.body;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.UpdateUserStatus(userId, status);
      body = { message: 'User status updated successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public verifyUser = async (req: RequestBody<{ isVerified: boolean }>, res: Response): Promise<void> => {
    let body;
    try {
      const { userId } = req.params;
      const { isVerified } = req.body;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.VerifyUser(userId, isVerified);
      body = { message: 'User verification status updated successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public updateUserRole = async (req: RequestBody<{ role: string }>, res: Response): Promise<void> => {
    let body;
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.UpdateUserRole(userId, role);
      body = { message: 'User role updated successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getUserSessions = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { userId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.GetUserSessions(userId);
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public revokeUserSession = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { userId, sessionId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.RevokeUserSession(userId, sessionId);
      body = { message: 'Session revoked successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getUserAuditLog = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { userId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.GetUserAuditLog(userId);
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

  // Payout management
  public getPayouts = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const status = (req.query.status as string) || undefined;
      const search = (req.query.search as string) || undefined;

      const response = await service.GetPayouts({ page, limit, status: status as any, search });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getPayoutDetails = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { payoutId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.GetPayoutDetails(payoutId);
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public approvePayout = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { payoutId } = req.params;
      const adminId = req.userId as string;

      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.ApprovePayout(payoutId, adminId);
      body = { message: 'Payout approved successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public rejectPayout = async (req: RequestBody<{ reason: string }>, res: Response): Promise<void> => {
    let body;
    try {
      const { payoutId } = req.params;
      const { reason } = req.body;
      const adminId = req.userId as string;

      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.RejectPayout(payoutId, adminId, reason);
      body = { message: 'Payout rejected successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public processPayout = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { payoutId } = req.params;
      const adminId = req.userId as string;

      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.ProcessPayout(payoutId, adminId);
      body = { message: 'Payout marked as processing' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public markPayoutAsPaid = async (req: RequestBody<{ providerDetails?: any }>, res: Response): Promise<void> => {
    let body;
    try {
      const { payoutId } = req.params;
      const { providerDetails } = req.body;
      const adminId = req.userId as string;

      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.MarkPayoutAsPaid(payoutId, adminId, providerDetails);
      body = { message: 'Payout marked as paid successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  // Community Management
  public getCommunities = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = (req.query.search as string) || undefined;
      const isPrivate = (req.query.isPrivate as string) || undefined;

      const response = await service.GetCommunities({ page, limit, search, isPrivate });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getCommunityDetails = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { communityId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.GetCommunityDetails(communityId);
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public updateCommunityStatus = async (
    req: RequestBody<{ status: 'active' | 'archived' | 'verified' | 'blocked' }>,
    res: Response,
  ): Promise<void> => {
    let body;
    try {
      const { communityId } = req.params;
      const { status } = req.body;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.UpdateCommunityStatus(communityId, status);
      body = { message: 'Community status updated successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getCommunityMembers = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { communityId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.GetCommunityMembers(communityId);
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  // Content Management
  public getPosts = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = (req.query.search as string) || undefined;
      const creatorId = (req.query.creatorId as string) || undefined;

      const response = await service.GetPosts({ page, limit, search, creatorId });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getPostDetails = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { postId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.GetPostDetails(postId);
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public deletePost = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { postId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.DeletePost(postId);
      body = { message: 'Post deleted successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getComments = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = (req.query.search as string) || undefined;

      const response = await service.GetComments({ page, limit, search });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public deleteComment = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { commentId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.DeleteComment(commentId);
      body = { message: 'Comment deleted successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  // Report Management
  public getReports = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const status = (req.query.status as string) || undefined;

      const response = await service.GetReports({ page, limit, status });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public resolveReport = async (
    req: RequestBody<{ action: string; notes?: string }>,
    res: Response,
  ): Promise<void> => {
    let body;
    try {
      const { reportId } = req.params;
      const { action, notes } = req.body;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.ResolveReport(reportId, action, notes);
      body = { message: 'Report resolved successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  // Wallet Management
  public getWallets = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = (req.query.search as string) || undefined;
      const minBalance = req.query.minBalance ? parseFloat(req.query.minBalance as string) : undefined;
      const maxBalance = req.query.maxBalance ? parseFloat(req.query.maxBalance as string) : undefined;
      const currency = (req.query.currency as 'USD' | 'COIN') || undefined;

      const response = await service.GetWallets({ page, limit, search, minBalance, maxBalance, currency });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getWalletDetails = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { walletId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.GetWalletDetails(walletId);
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public creditWallet = async (
    req: RequestBody<Omit<AdminModel.AdminCreditDebitDto, 'type'>>,
    res: Response,
  ): Promise<void> => {
    let body;
    try {
      const { walletId } = req.params;
      const { amount, currency, reason } = req.body;
      const adminId = req.userId as string;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.CreditDebitWallet(walletId, { amount, currency, reason, type: 'CREDIT' }, adminId);
      body = { message: 'Wallet credited successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public debitWallet = async (
    req: RequestBody<Omit<AdminModel.AdminCreditDebitDto, 'type'>>,
    res: Response,
  ): Promise<void> => {
    let body;
    try {
      const { walletId } = req.params;
      const { amount, currency, reason } = req.body;
      const adminId = req.userId as string;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.CreditDebitWallet(walletId, { amount, currency, reason, type: 'DEBIT' }, adminId);
      body = { message: 'Wallet debited successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public refundTransaction = async (
    req: RequestBody<{ reason: string }>,
    res: Response,
  ): Promise<void> => {
    let body;
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;
      const adminId = req.userId as string;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.RefundTransaction(transactionId, adminId, reason);
      body = { message: 'Transaction refunded successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  // System & Integrations
  public getLinkInBioProfiles = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = (req.query.search as string) || undefined;

      const response = await service.GetLinkInBioProfiles({ page, limit, search });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public deleteLinkInBioProfile = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { profileId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.DeleteLinkInBioProfile(profileId);
      body = { message: 'Profile deleted successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getSystemAdmins = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.GetSystemAdmins();
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public inviteAdmin = async (req: RequestBody<AdminModel.AdminInviteAdminDto>, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.InviteAdmin(req.body);
      body = { message: 'Admin invited successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public removeAdmin = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { adminId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.RemoveAdmin(adminId);
      body = { message: 'Admin removed successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  // Marketplace & Payments
  public getGlobalTransactions = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const status = req.query.status as string;
      const type = req.query.type as string;

      const response = await service.GetGlobalTransactions({ page, limit, status, type });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getProducts = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = req.query.search as string;
      const productType = req.query.productType as 'digital' | 'physical';

      const response = await service.GetProducts({ page, limit, search, productType });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public updateProductStatus = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { productId } = req.params;
      const { isActive } = req.body;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.UpdateProductStatus(productId, isActive);
      body = { message: 'Product status updated successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getOrders = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = req.query.search as string;
      const status = req.query.status as string;

      const response = await service.GetOrders({ page, limit, search, status });
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getOrderDetails = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { orderId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.GetOrderDetails(orderId);
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public releaseEscrow = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { orderId } = req.params;
      const adminId = (req as any).userId;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.ReleaseEscrow(orderId, adminId);
      body = { message: 'Escrow released successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  // Categories
  public getCategories = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.GetCategories();
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public createCategory = async (req: RequestBody<AdminModel.AdminCreateCategoryDto>, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      const response = await service.CreateCategory(req.body);
      body = { data: response };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public updateCategory = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { categoryId } = req.params;
      const { name } = req.body;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.UpdateCategory(categoryId, name);
      body = { message: 'Category updated successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public deleteCategory = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const { categoryId } = req.params;
      const db = res.locals.db as Db;
      const service = new AdminService({ db });

      await service.DeleteCategory(categoryId);
      body = { message: 'Category deleted successfully' };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };
}




