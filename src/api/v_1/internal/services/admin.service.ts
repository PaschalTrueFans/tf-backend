import { Db } from '../../../../database/db';
import { Logger } from '../../../../helpers/logger';
import { EmailService } from '../../../../helpers/email';
import { AppError } from '../../../../helpers/errors';
import { Entities } from '../../../../helpers';
import * as AdminModel from '../models/admin.model';

export class AdminService {
  private db: Db;
  private emailService: EmailService;

  constructor(args: { db: Db }) {
    this.db = args.db;
    this.emailService = new EmailService();
  }

  async GetDashboardOverview(): Promise<AdminModel.DashboardOverview> {
    try {
      Logger.info('AdminService.GetDashboardOverview');

      // Get total users count
      const totalUsers = await this.db.v1.User.GetTotalUsersCount();

      // Get total creators count (users with pageName)
      const totalCreators = await this.db.v1.User.GetTotalCreatorsCount();

      // Get revenue data
      const revenueData = await this.db.v1.User.GetRevenueStats();

      // Get new signups data
      const newSignupsData = await this.db.v1.User.GetNewSignupsStats();

      return {
        totalUsers,
        totalCreators,
        revenue: {
          allTime: parseFloat(revenueData.allTime) || 0,
          currentMonth: parseFloat(revenueData.currentMonth) || 0,
        },
        newSignups: {
          today: newSignupsData.today,
          thisWeek: newSignupsData.thisWeek,
          thisMonth: newSignupsData.thisMonth,
        },
      };
    } catch (error) {
      Logger.error('AdminService.GetDashboardOverview Error', error);
      throw error;
    }
  }

  async GetUsers(filters: AdminModel.AdminUserListFilters): Promise<AdminModel.AdminUserListResponse> {
    try {
      Logger.info('AdminService.GetUsers', filters);

      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;

      const { users, total } = await this.db.v1.User.GetUsersWithFilters({
        page,
        limit,
        search: filters.search,
        role: filters.role,
        isBlocked: filters.isBlocked,
      });

      const items: AdminModel.AdminUserListItem[] = users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.pageName ? 'creator' : 'member',
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
      }));

      return {
        users: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      Logger.error('AdminService.GetUsers Error', error);
      throw error;
    }
  }

  async UpdateUserBlockStatus(userId: string, isBlocked: boolean): Promise<AdminModel.AdminUserListItem> {
    try {
      Logger.info('AdminService.UpdateUserBlockStatus', { userId, isBlocked });

      const updatedUser = await this.db.v1.User.UpdateUser(userId, { isBlocked });

      if (!updatedUser) {
        throw new AppError(404, 'User not found');
      }

      return {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.pageName ? 'creator' : 'member',
        isBlocked: updatedUser.isBlocked,
        createdAt: updatedUser.createdAt,
      };
    } catch (error) {
      Logger.error('AdminService.UpdateUserBlockStatus Error', error);
      throw error;
    }
  }

  async GetTransactions(filters: AdminModel.AdminTransactionListFilters): Promise<AdminModel.AdminTransactionListResponse> {
    try {
      Logger.info('AdminService.GetTransactions', filters);

      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;

      const { transactions, total } = await this.db.v1.Admin.GetTransactionsWithFilters({
        page,
        limit,
        search: filters.search,
        status: filters.status,
      });

      const items: AdminModel.AdminTransactionListItem[] = transactions.map((transaction) => ({
        id: transaction.id,
        user: {
          id: transaction.userId,
          name: transaction.userName,
          email: transaction.userEmail,
        },
        amount: parseFloat(transaction.amount || '0'),
        status: transaction.status,
        createdAt: transaction.createdAt,
      }));

      return {
        transactions: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      Logger.error('AdminService.GetTransactions Error', error);
      throw error;
    }
  }

  async GetTickets(filters: AdminModel.AdminTicketListFilters): Promise<AdminModel.AdminTicketListResponse> {
    try {
      Logger.info('AdminService.GetTickets', filters);

      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;

      const { tickets, total } = await this.db.v1.Admin.GetTicketsWithFilters({
        page,
        limit,
        search: filters.search,
        status: filters.status,
      });

      const items: AdminModel.AdminTicketListItem[] = tickets.map((ticket) => ({
        id: ticket.id,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status,
        user: {
          id: ticket.userId,
          name: ticket.userName,
          email: ticket.userEmail,
        },
        comments: ticket.comments.map((comment: any) => ({
          id: comment.id,
          ticketId: comment.ticketId,
          comment: comment.comment,
          adminId: comment.adminId,
          adminName: comment.adminName,
          createdAt: comment.createdAt,
        })),
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      }));

      return {
        tickets: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      Logger.error('AdminService.GetTickets Error', error);
      throw error;
    }
  }

  async AddTicketComment(args: {
    ticketId: string;
    adminId: string | null;
    comment: string;
  }): Promise<AdminModel.AdminTicketComment> {
    try {
      Logger.info('AdminService.AddTicketComment', args);

      if (!args.comment?.trim()) {
        throw new AppError(400, 'Comment is required');
      }

      const comment = await this.db.v1.Admin.CreateTicketComment({
        ticketId: args.ticketId,
        adminId: args.adminId,
        comment: args.comment.trim(),
      });

      return {
        id: comment.id,
        ticketId: comment.ticketId,
        comment: comment.comment,
        adminId: comment.adminId,
        adminName: comment.adminName,
        createdAt: comment.createdAt,
      };
    } catch (error) {
      Logger.error('AdminService.AddTicketComment Error', error);
      throw error;
    }
  }

  async UpdateTicketStatus(
    ticketId: string,
    status: AdminModel.AdminTicketStatus,
  ): Promise<AdminModel.AdminTicketListItem> {
    try {
      Logger.info('AdminService.UpdateTicketStatus', { ticketId, status });

      const allowedStatuses: AdminModel.AdminTicketStatus[] = ['open', 'in_progress', 'completed'];
      if (!allowedStatuses.includes(status)) {
        throw new AppError(400, 'Invalid ticket status');
      }

      const updatedTicket = await this.db.v1.Admin.UpdateTicketStatus(ticketId, status);

      if (!updatedTicket) {
        throw new AppError(404, 'Ticket not found');
      }

      const { tickets } = await this.db.v1.Admin.GetTicketsWithFilters({
        ticketId,
      });

      const ticket = tickets?.[0];

      if (!ticket) {
        throw new AppError(404, 'Ticket not found');
      }

      return {
        id: ticket.id,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status,
        user: {
          id: ticket.userId,
          name: ticket.userName,
          email: ticket.userEmail,
        },
        comments: ticket.comments.map((comment: any) => ({
          id: comment.id,
          ticketId: comment.ticketId,
          comment: comment.comment,
          adminId: comment.adminId,
          adminName: comment.adminName,
          createdAt: comment.createdAt,
        })),
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      };
    } catch (error) {
      Logger.error('AdminService.UpdateTicketStatus Error', error);
      throw error;
    }
  }

  async GetSystemNotifications(
    filters: AdminModel.AdminSystemNotificationFilters,
  ): Promise<AdminModel.AdminSystemNotificationListResponse> {
    try {
      Logger.info('AdminService.GetSystemNotifications', filters);

      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;

      const { notifications, total } = await this.db.v1.Admin.GetSystemNotifications({
        page,
        limit,
        search: filters.search,
      });

      const items: AdminModel.AdminSystemNotification[] = notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        adminId: notification.adminId,
        adminName: notification.adminName,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
      }));

      return {
        notifications: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      Logger.error('AdminService.GetSystemNotifications Error', error);
      throw error;
    }
  }

  async CreateSystemNotification(
    adminId: string | null,
    payload: AdminModel.AdminCreateSystemNotificationDto,
  ): Promise<AdminModel.AdminSystemNotification> {
    try {
      Logger.info('AdminService.CreateSystemNotification', { adminId, payload });

      if (!payload.title?.trim()) {
        throw new AppError(400, 'Title is required');
      }

      if (!payload.message?.trim()) {
        throw new AppError(400, 'Message is required');
      }

      const { id } = await this.db.v1.Admin.CreateSystemNotification({
        title: payload.title.trim(),
        message: payload.message.trim(),
        adminId,
      });

      const created = await this.db.v1.Admin.GetSystemNotificationById(id);

      if (!created) {
        throw new AppError(400, 'Failed to fetch created notification');
      }

      // Send notifications to all users in batches to avoid connection pool exhaustion
      try {
        const userIds = await this.db.v1.User.GetAllUserIds();

        // Use adminId as fromUserId, or use a system user ID if adminId is null
        const adminUser = await this.db.v1.User.GetUserByEmail('admin@truefans.ng');
        const fromUserId = adminUser?.id || userIds[0] || ''; // Fallback to first user if no admin

        // Process notifications in batches to avoid overwhelming the database connection pool
        const BATCH_SIZE = 50; // Process 50 notifications at a time
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
          const batch = userIds.slice(i, i + BATCH_SIZE);

          const batchPromises = batch.map(async (userId) => {
            const notification: Partial<Entities.Notification> = {
              userId,
              title: created.title,
              message: created.message,
              redirectUrl: '/notifications',
              fromUserId,
              type: 'member',
              isRead: false,
            };

            return this.db.v1.User.CreateNotification(notification);
          });

          // Process batch and count results
          const batchResults = await Promise.allSettled(batchPromises);
          batchResults.forEach((result) => {
            if (result.status === 'fulfilled') {
              successCount++;
            } else {
              errorCount++;
            }
          });
        }

        Logger.info('AdminService.CreateSystemNotification - Notifications sent', {
          systemNotificationId: id,
          totalUsers: userIds.length,
          successCount,
          errorCount,
        });
      } catch (error) {
        // Log error but don't fail the system notification creation
        Logger.error('AdminService.CreateSystemNotification - Failed to send notifications', error);
      }

      return {
        id: created.id,
        title: created.title,
        message: created.message,
        adminId: created.adminId,
        adminName: created.adminName,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    } catch (error) {
      Logger.error('AdminService.CreateSystemNotification Error', error);
      throw error;
    }
  }

  async UpdateSystemNotification(
    id: string,
    payload: AdminModel.AdminUpdateSystemNotificationDto,
  ): Promise<AdminModel.AdminSystemNotification> {
    try {
      Logger.info('AdminService.UpdateSystemNotification', { id, payload });

      if (!payload.title && !payload.message) {
        throw new AppError(400, 'At least one field (title or message) is required');
      }

      const updatePayload: Partial<AdminModel.AdminUpdateSystemNotificationDto> = {};

      if (payload.title !== undefined) {
        if (!payload.title.trim()) {
          throw new AppError(400, 'Title cannot be empty');
        }
        updatePayload.title = payload.title.trim();
      }

      if (payload.message !== undefined) {
        if (!payload.message.trim()) {
          throw new AppError(400, 'Message cannot be empty');
        }
        updatePayload.message = payload.message.trim();
      }

      const updated = await this.db.v1.Admin.UpdateSystemNotification(id, updatePayload);

      if (!updated) {
        throw new AppError(404, 'System notification not found');
      }

      const refreshed = await this.db.v1.Admin.GetSystemNotificationById(id);

      if (!refreshed) {
        throw new AppError(400, 'Failed to fetch updated notification');
      }

      return {
        id: refreshed.id,
        title: refreshed.title,
        message: refreshed.message,
        adminId: refreshed.adminId,
        adminName: refreshed.adminName,
        createdAt: refreshed.createdAt,
        updatedAt: refreshed.updatedAt,
      };
    } catch (error) {
      Logger.error('AdminService.UpdateSystemNotification Error', error);
      throw error;
    }
  }

  async DeleteSystemNotification(id: string): Promise<void> {
    try {
      Logger.info('AdminService.DeleteSystemNotification', { id });

      await this.db.v1.Admin.DeleteSystemNotification(id);
    } catch (error) {
      Logger.error('AdminService.DeleteSystemNotification Error', error);
      throw error;
    }
  }

  async GetEmailBroadcasts(
    filters: AdminModel.AdminEmailBroadcastFilters,
  ): Promise<AdminModel.AdminEmailBroadcastListResponse> {
    try {
      Logger.info('AdminService.GetEmailBroadcasts', filters);

      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;

      const { broadcasts, total } = await this.db.v1.Admin.GetEmailBroadcasts({
        page,
        limit,
        search: filters.search,
      });

      const items: AdminModel.AdminEmailBroadcast[] = broadcasts.map((broadcast) => ({
        id: broadcast.id,
        subject: broadcast.subject,
        message: broadcast.message,
        recipientCount: broadcast.recipientCount,
        adminId: broadcast.adminId,
        adminName: broadcast.adminName,
        createdAt: broadcast.createdAt,
        updatedAt: broadcast.updatedAt,
      }));

      return {
        broadcasts: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      Logger.error('AdminService.GetEmailBroadcasts Error', error);
      throw error;
    }
  }

  async CreateEmailBroadcast(
    adminId: string | null,
    payload: AdminModel.AdminCreateEmailBroadcastDto,
  ): Promise<AdminModel.AdminEmailBroadcast> {
    try {
      Logger.info('AdminService.CreateEmailBroadcast', { adminId, payload });

      const subject = payload.subject?.trim();
      const message = payload.message?.trim();

      if (!subject) {
        throw new AppError(400, 'Subject is required');
      }

      if (!message) {
        throw new AppError(400, 'Message is required');
      }

      const emails = await this.db.v1.User.GetAllUserEmails();
      Logger.info('AdminService.CreateEmailBroadcast recipients', { count: emails.length });

      if (emails.length > 0) {
        const sendResults = await Promise.allSettled(
          emails.map((email) => this.emailService.SendPlainEmail(email, subject, message)),
        );

        const failed = sendResults.filter((result) => result.status === 'rejected');

        if (failed.length > 0) {
          Logger.error('AdminService.CreateEmailBroadcast Some emails failed', {
            failed: failed.length,
            total: emails.length,
          });
        }
      }

      const { id } = await this.db.v1.Admin.CreateEmailBroadcast({
        subject,
        message,
        adminId,
        recipientCount: emails.length,
      });

      const created = await this.db.v1.Admin.GetEmailBroadcastById(id);

      if (!created) {
        throw new AppError(400, 'Failed to fetch created email broadcast');
      }

      return {
        id: created.id,
        subject: created.subject,
        message: created.message,
        recipientCount: created.recipientCount,
        adminId: created.adminId,
        adminName: created.adminName,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    } catch (error) {
      Logger.error('AdminService.CreateEmailBroadcast Error', error);
      throw error;
    }
  }

  async GetSettings(): Promise<{
    id: string;
    platformFee: string;
    createdAt: string;
    updatedAt: string;
  }> {
    try {
      Logger.info('AdminService.GetSettings');

      const settings = await this.db.v1.Admin.GetSettings();

      if (!settings) {
        // Return default settings if none exist
        return {
          id: '',
          platformFee: '0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return settings;
    } catch (error) {
      Logger.error('AdminService.GetSettings Error', error);
      throw error;
    }
  }

  async UpdateSettings(platformFee: string): Promise<{
    id: string;
    platformFee: string;
    createdAt: string;
    updatedAt: string;
  }> {
    try {
      Logger.info('AdminService.UpdateSettings', { platformFee });

      // Validate platformFee
      const feeNumber = parseFloat(platformFee);
      if (isNaN(feeNumber) || feeNumber < 0 || feeNumber > 100) {
        throw new AppError(400, 'Platform fee must be a number between 0 and 100');
      }

      const updatedSettings = await this.db.v1.Admin.UpdateSettings(platformFee);

      return updatedSettings;
    } catch (error) {
      Logger.error('AdminService.UpdateSettings Error', error);
      throw error;
    }
  }
}

