import { Db } from '../../../../database/db';
import { Logger } from '../../../../helpers/logger';
import { EmailService } from '../../../../helpers/email';
import { AppError } from '../../../../helpers/errors';
import { Entities } from '../../../../helpers';
import * as AdminModel from '../models/admin.model';
import { UserModel } from '../../../../database/models/User';
import { WalletModel } from '../../../../database/models/Wallet';
import { PostModel } from '../../../../database/models/Post';
import { FollowerModel, ProductModel, OrderModel, TransactionModel, CategoryModel } from '../../../../database/models/Other';
import { CommunityModel } from '../../../../database/models/Community';
import { CommentModel } from '../../../../database/models/Post';
import { CommunityReportModel } from '../../../../database/models/CommunityReport';
import { CommunityMemberModel } from '../../../../database/models/CommunityMember';
import { WalletTransactionModel } from '../../../../database/models/WalletTransaction';
import { PayoutModel } from '../../../../database/models/Payout';
import { LinkInBioProfileModel } from '../../../../database/models/LinkInBioProfile';
import { AdminModel as AdminAuthModel } from '../../../../database/models/Admin';
import * as bcrypt from 'bcryptjs';

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

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // ========== USER METRICS ==========
      const totalUsers = await UserModel.countDocuments({});
      const activeUsers = await UserModel.countDocuments({ updatedAt: { $gte: monthAgo } });
      const blockedUsers = await UserModel.countDocuments({ isBlocked: true });
      const verifiedUsers = await UserModel.countDocuments({ isVerified: true });
      const newUsersToday = await UserModel.countDocuments({ createdAt: { $gte: today } });
      const newUsersThisWeek = await UserModel.countDocuments({ createdAt: { $gte: weekAgo } });
      const newUsersThisMonth = await UserModel.countDocuments({ createdAt: { $gte: startOfMonth } });

      // ========== CREATOR METRICS ==========
      const totalCreators = await UserModel.countDocuments({ pageName: { $exists: true, $ne: null } });
      const verifiedCreators = await UserModel.countDocuments({ pageName: { $exists: true, $ne: null }, isVerified: true });
      const creatorsWithProducts = await ProductModel.distinct('creatorId');
      const creatorsWithCommunities = await CommunityModel.distinct('creatorId');

      // Top 5 creators by revenue (simplified - using transaction sum)
      const topCreatorsAgg = await TransactionModel.aggregate([
        { $match: { status: 'succeeded' } },
        { $group: { _id: '$creatorId', revenue: { $sum: '$amount' } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 }
      ]);

      const topCreators = await Promise.all(topCreatorsAgg.map(async (c: any) => {
        const user = await UserModel.findById(c._id);
        const subscribers = await FollowerModel.countDocuments({ userId: c._id });
        return { id: c._id, name: user?.name || 'Unknown', revenue: c.revenue, subscribers };
      }));

      // ========== CONTENT METRICS ==========
      const totalPosts = await PostModel.countDocuments({});
      const postsToday = await PostModel.countDocuments({ createdAt: { $gte: today } });
      const postsThisWeek = await PostModel.countDocuments({ createdAt: { $gte: weekAgo } });
      const totalComments = await CommentModel.countDocuments({});
      const totalCommunities = await CommunityModel.countDocuments({});
      const activeCommunities = await CommunityModel.countDocuments({ updatedAt: { $gte: weekAgo } });
      const { PollModel } = require('../../../../database/models/Poll');
      const totalPolls = await PollModel.countDocuments({});
      const pendingReports = await CommunityReportModel.countDocuments({ status: 'pending' });

      // ========== ENGAGEMENT METRICS ==========
      const totalFollows = await FollowerModel.countDocuments({});
      const followsToday = await FollowerModel.countDocuments({ createdAt: { $gte: today } });
      const { LikeModel } = require('../../../../database/models/Post');
      let totalLikes = 0;
      let likesToday = 0;
      try {
        totalLikes = await LikeModel.countDocuments({});
        likesToday = await LikeModel.countDocuments({ createdAt: { $gte: today } });
      } catch (e) { /* LikeModel may not exist */ }
      const averagePostsPerCreator = totalCreators > 0 ? Math.round(totalPosts / totalCreators) : 0;

      // ========== FINANCIAL METRICS ==========
      const revenueAgg = await TransactionModel.aggregate([
        { $match: { status: 'succeeded' } },
        { $group: { _id: null, total: { $sum: '$amount' }, fees: { $sum: '$platformFee' } } }
      ]);
      const totalRevenue = revenueAgg[0]?.total || 0;
      const platformFees = revenueAgg[0]?.fees || 0;

      const revenueThisMonthAgg = await TransactionModel.aggregate([
        { $match: { status: 'succeeded', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const revenueThisMonth = revenueThisMonthAgg[0]?.total || 0;

      const revenueTodayAgg = await TransactionModel.aggregate([
        { $match: { status: 'succeeded', createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const revenueToday = revenueTodayAgg[0]?.total || 0;

      const walletBalanceAgg = await WalletModel.aggregate([
        { $group: { _id: null, usd: { $sum: '$usdBalance' }, coins: { $sum: '$coinBalance' } } }
      ]);
      const totalWalletBalance = walletBalanceAgg[0]?.usd || 0;
      const totalCoinBalance = walletBalanceAgg[0]?.coins || 0;

      const totalOrdersCount = await OrderModel.countDocuments({});
      const orderValueAgg = await OrderModel.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const averageOrderValue = totalOrdersCount > 0 ? (orderValueAgg[0]?.total || 0) / totalOrdersCount : 0;

      // ========== PAYOUT METRICS ==========
      const pendingPayouts = await PayoutModel.countDocuments({ status: 'pending' });
      const pendingPayoutAmtAgg = await PayoutModel.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const pendingPayoutAmount = pendingPayoutAmtAgg[0]?.total || 0;

      const approvedPayouts = await PayoutModel.countDocuments({ status: 'approved' });
      const approvedPayoutAmtAgg = await PayoutModel.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const approvedPayoutAmount = approvedPayoutAmtAgg[0]?.total || 0;

      const completedPayouts = await PayoutModel.countDocuments({ status: 'completed' });
      const completedPayoutsThisMonth = await PayoutModel.countDocuments({ status: 'completed', paidAt: { $gte: startOfMonth } });
      const rejectedPayouts = await PayoutModel.countDocuments({ status: 'rejected' });

      // ========== SUBSCRIPTION METRICS ==========
      const { SubscriptionModel, MembershipModel } = require('../../../../database/models/Other');
      const totalActiveSubscriptions = await SubscriptionModel.countDocuments({ isActive: true });
      const newSubscriptionsThisMonth = await SubscriptionModel.countDocuments({ createdAt: { $gte: startOfMonth }, isActive: true });
      const canceledSubscriptionsThisMonth = await SubscriptionModel.countDocuments({ canceledAt: { $gte: startOfMonth } });
      const churnRate = totalActiveSubscriptions > 0 ? Math.round((canceledSubscriptionsThisMonth / totalActiveSubscriptions) * 100) : 0;

      const subValueAgg = await SubscriptionModel.aggregate([
        { $match: { isActive: true } },
        { $lookup: { from: 'memberships', localField: 'membershipId', foreignField: '_id', as: 'membership' } },
        { $unwind: { path: '$membership', preserveNullAndEmptyArrays: true } },
        { $group: { _id: null, avgPrice: { $avg: { $toDouble: '$membership.price' } } } }
      ]);
      const averageSubscriptionValue = subValueAgg[0]?.avgPrice || 0;
      const totalMemberships = await MembershipModel.countDocuments({});

      // ========== MARKETPLACE METRICS ==========
      const totalProducts = await ProductModel.countDocuments({});
      const digitalProducts = await ProductModel.countDocuments({ productType: 'digital' });
      const physicalProducts = await ProductModel.countDocuments({ productType: 'physical' });
      const activeProducts = await ProductModel.countDocuments({ isActive: true });
      const totalOrders = await OrderModel.countDocuments({});
      const ordersToday = await OrderModel.countDocuments({ createdAt: { $gte: today } });
      const ordersThisWeek = await OrderModel.countDocuments({ createdAt: { $gte: weekAgo } });
      const pendingOrders = await OrderModel.countDocuments({ status: 'pending' });
      const shippedOrders = await OrderModel.countDocuments({ status: 'shipped' });
      const deliveredOrders = await OrderModel.countDocuments({ status: 'delivered' });
      const escrowHeld = await OrderModel.countDocuments({ escrowStatus: 'held' });
      const escrowAmountAgg = await OrderModel.aggregate([
        { $match: { escrowStatus: 'held' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const escrowAmount = escrowAmountAgg[0]?.total || 0;

      // ========== PLATFORM HEALTH ==========
      const { tickets: openTicketsData } = await this.db.v1.Admin.GetTicketsWithFilters({ status: 'open', limit: 1 });
      const openTickets = await this.db.v1.Admin.GetTicketsWithFilters({ status: 'open' }).then(r => r.total);
      const resolvedTicketsToday = 0; // Would need ticket history tracking
      const { total: systemNotifications } = await this.db.v1.Admin.GetSystemNotifications({ limit: 1 });
      const emailBroadcastsSent = await this.db.v1.Admin.GetEmailBroadcasts({}).then(r => r.total);
      const linkInBioProfiles = await LinkInBioProfileModel.countDocuments({});
      const totalCategories = await CategoryModel.countDocuments({});

      // ========== 7-DAY TRENDS ==========
      const signupsTrend: number[] = [];
      const revenueTrend: number[] = [];
      const ordersTrend: number[] = [];

      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        signupsTrend.push(await UserModel.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } }));
        ordersTrend.push(await OrderModel.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } }));

        const dayRevAgg = await TransactionModel.aggregate([
          { $match: { status: 'succeeded', createdAt: { $gte: dayStart, $lt: dayEnd } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        revenueTrend.push(dayRevAgg[0]?.total || 0);
      }

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          blocked: blockedUsers,
          verified: verifiedUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersThisWeek,
          newThisMonth: newUsersThisMonth,
        },
        creators: {
          total: totalCreators,
          verified: verifiedCreators,
          withProducts: creatorsWithProducts.length,
          withCommunities: creatorsWithCommunities.length,
          topCreators,
        },
        content: {
          totalPosts,
          postsToday,
          postsThisWeek,
          totalComments,
          totalCommunities,
          activeCommunities,
          totalPolls,
          pendingReports,
        },
        engagement: {
          totalFollows,
          followsToday,
          totalLikes,
          likesToday,
          averagePostsPerCreator,
        },
        finance: {
          totalRevenue,
          revenueThisMonth,
          revenueToday,
          platformFees,
          averageOrderValue,
          totalWalletBalance,
          totalCoinBalance,
        },
        payouts: {
          pending: pendingPayouts,
          pendingAmount: pendingPayoutAmount,
          approved: approvedPayouts,
          approvedAmount: approvedPayoutAmount,
          completed: completedPayouts,
          completedThisMonth: completedPayoutsThisMonth,
          rejected: rejectedPayouts,
        },
        subscriptions: {
          totalActive: totalActiveSubscriptions,
          newThisMonth: newSubscriptionsThisMonth,
          canceledThisMonth: canceledSubscriptionsThisMonth,
          churnRate,
          averageSubscriptionValue,
          totalMemberships,
        },
        marketplace: {
          totalProducts,
          digitalProducts,
          physicalProducts,
          activeProducts,
          totalOrders,
          ordersToday,
          ordersThisWeek,
          pendingOrders,
          shippedOrders,
          deliveredOrders,
          escrowHeld,
          escrowAmount,
        },
        platform: {
          openTickets,
          resolvedTicketsToday,
          systemNotifications,
          emailBroadcastsSent,
          linkInBioProfiles,
          totalCategories,
        },
        trends: {
          signupsTrend,
          revenueTrend,
          ordersTrend,
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

  async GetUserDetails(userId: string): Promise<AdminModel.AdminUserDetails> {
    try {
      const user = await this.db.v1.User.GetUser({ id: userId });
      if (!user) throw new AppError(404, 'User not found');

      const wallet = await WalletModel.findOne({ userId });
      const stats = {
        postsCount: await PostModel.countDocuments({ creatorId: userId }),
        followersCount: await FollowerModel.countDocuments({ userId }),
        followingCount: await FollowerModel.countDocuments({ followerId: userId }),
        communitiesCount: await CommunityModel.countDocuments({ creatorId: userId }),
      };

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.pageName ? 'creator' : 'member',
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        avatar: user.profilePhoto || null,
        bio: user.bio || null,
        location: null, // User model doesn't seem to have location directly on root, maybe in socialLinks?
        website: user.socialLinks?.website || null,
        twitter: user.socialLinks?.twitter || null,
        instagram: user.socialLinks?.instagram || null,
        isVerified: user.isVerified || false,
        walletBalance: wallet?.usdBalance || 0,
        stats,
      };
    } catch (error) {
      Logger.error('AdminService.GetUserDetails Error', error);
      throw error;
    }
  }

  async UpdateUserDetails(userId: string, data: AdminModel.AdminUpdateUserDto): Promise<AdminModel.AdminUserDetails> {
    try {
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email;
      if (data.bio) updateData.bio = data.bio;
      // location, website handling if needed

      const updatedUser = await this.db.v1.User.UpdateUser(userId, updateData);
      if (!updatedUser) throw new AppError(404, 'User not found');

      return this.GetUserDetails(userId);
    } catch (error) {
      Logger.error('AdminService.UpdateUserDetails Error', error);
      throw error;
    }
  }

  async UpdateUserStatus(userId: string, status: 'ban' | 'suspend' | 'activate'): Promise<void> {
    try {
      const isBlocked = status === 'ban' || status === 'suspend';
      await this.db.v1.User.UpdateUser(userId, { isBlocked });
    } catch (error) {
      Logger.error('AdminService.UpdateUserStatus Error', error);
      throw error;
    }
  }

  async VerifyUser(userId: string, isVerified: boolean): Promise<void> {
    try {
      await this.db.v1.User.UpdateUser(userId, { isVerified });
    } catch (error) {
      Logger.error('AdminService.VerifyUser Error', error);
      throw error;
    }
  }

  async UpdateUserRole(userId: string, role: string): Promise<void> {
    try {
      // Role logic might be complex (creating pageName etc), for now just updating 'role' field if exists
      // User model has 'role' enum ['creator', 'member']
      if (role !== 'creator' && role !== 'member') throw new AppError(400, 'Invalid role');
      await this.db.v1.User.UpdateUser(userId, { role: role as any });
    } catch (error) {
      Logger.error('AdminService.UpdateUserRole Error', error);
      throw error;
    }
  }

  async GetUserSessions(userId: string): Promise<AdminModel.AdminUserSession[]> {
    // Session management is likely JWT based, so no persistent sessions to list unless we implement it.
    // Returning empty for now as placeholder for Phase 2 spec.
    return [];
  }

  async RevokeUserSession(userId: string, sessionId: string): Promise<void> {
    // Placeholder
  }

  async GetUserAuditLog(userId: string): Promise<AdminModel.AdminUserAuditLog[]> {
    // Placeholder
    return [];
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
        const adminUser = await this.db.v1.User.GetUserByEmail('admin@ruutz.com');
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

  // Payout Management
  async GetPayouts(filters: AdminModel.AdminPayoutListFilters): Promise<AdminModel.AdminPayoutListResponse> {
    try {
      Logger.info('AdminService.GetPayouts', filters);

      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;
      const query: any = {};

      if (filters.status) query.status = filters.status;
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const payouts = await (PayoutModel.find(query) as any)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'name email');

      const total = await PayoutModel.countDocuments(query);

      const items: AdminModel.AdminPayoutListItem[] = payouts.map((p: any) => ({
        id: p.id,
        userId: p.userId?._id?.toString() || p.userId,
        userName: p.userId?.name,
        userEmail: p.userId?.email,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        paymentDetails: p.paymentDetails,
        createdAt: p.createdAt,
        reviewedAt: p.reviewedAt,
        paidAt: p.paidAt,
      }));

      return {
        payouts: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      Logger.error('AdminService.GetPayouts Error', error);
      throw error;
    }
  }

  async GetPayoutDetails(payoutId: string): Promise<AdminModel.AdminPayoutDetails> {
    try {
      const payout: any = await PayoutModel.findById(payoutId)
        .populate('userId', 'name email')
        .populate('reviewedBy', 'name email')
        .populate('paidBy', 'name email');

      if (!payout) throw new AppError(404, 'Payout not found');

      return {
        id: payout.id,
        userId: payout.userId?._id?.toString() || payout.userId,
        userName: payout.userId?.name,
        userEmail: payout.userId?.email,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        createdAt: payout.createdAt,
        paymentDetails: payout.paymentDetails,
        reviewNote: payout.reviewNote,
        reviewedAt: payout.reviewedAt?.toISOString(),
        reviewedBy: payout.reviewedBy?.name || payout.reviewedBy?.email,
        paidAt: payout.paidAt?.toISOString(),
        paidBy: payout.paidBy?.name || payout.paidBy?.email,
        provider: payout.provider,
        providerTransferId: payout.providerTransferId,
      };
    } catch (error) {
      Logger.error('AdminService.GetPayoutDetails Error', error);
      throw error;
    }
  }

  async ApprovePayout(payoutId: string, adminId: string): Promise<void> {
    try {
      Logger.info('AdminService.ApprovePayout', { payoutId, adminId });

      const payout = await this.db.v1.Wallet.GetPayoutById(payoutId);
      if (!payout) throw new AppError(404, 'Payout request not found');
      if (payout.status !== 'pending') throw new AppError(400, `Cannot approve payout with status ${payout.status}`);

      // Balance was already deducted at request time in this new flow.
      // Just update payout status and transaction status.

      // Update payout status
      await this.db.v1.Wallet.UpdatePayoutStatus(payoutId, {
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date().toISOString()
      });

      // Update wallet transaction status
      await this.db.v1.Wallet.UpdateTransactionByPayoutId(payoutId, { status: 'COMPLETED' });

      // In a real app, update the global Transaction model status too if needed.
      // But for now, simple implementation.

      Logger.info('Payout approved', { payoutId, userId: payout.userId });
    } catch (error) {
      Logger.error('AdminService.ApprovePayout Error', error);
      throw error;
    }
  }

  async RejectPayout(payoutId: string, adminId: string, reason: string): Promise<void> {
    try {
      Logger.info('AdminService.RejectPayout', { payoutId, adminId, reason });

      const payout = await this.db.v1.Wallet.GetPayoutById(payoutId);
      if (!payout) throw new AppError(404, 'Payout request not found');
      if (payout.status !== 'pending' && payout.status !== 'processing') {
        throw new AppError(400, `Cannot reject payout with status ${payout.status}`);
      }

      // 1. Update payout status
      await this.db.v1.Wallet.UpdatePayoutStatus(payoutId, {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date().toISOString(),
        reviewNote: reason
      });

      // 2. REFUND the balance (since it was deducted at request time)
      await this.db.v1.Wallet.IncrementBalance(payout.userId, { usd: payout.amount });

      // 3. Update or create transaction record for refund
      await this.db.v1.Wallet.UpdateTransactionByPayoutId(payoutId, { status: 'FAILED', metadata: { rejectionReason: reason } });

      const wallet = await this.db.v1.Wallet.GetWallet(payout.userId);
      await this.db.v1.Wallet.CreateTransaction({
        walletId: wallet?.id,
        type: 'DEPOSIT', // Or a new type 'PAYOUT_REFUND'
        amount: payout.amount,
        currency: 'USD',
        status: 'COMPLETED',
        metadata: { note: 'Payout rejected refund', payoutId: payout.id }
      });

      Logger.info('Payout rejected and funds refunded', { payoutId, userId: payout.userId });
    } catch (error) {
      Logger.error('AdminService.RejectPayout Error', error);
      throw error;
    }
  }

  async ProcessPayout(payoutId: string, adminId: string): Promise<void> {
    try {
      Logger.info('AdminService.ProcessPayout', { payoutId, adminId });

      const payout = await PayoutModel.findById(payoutId);
      if (!payout) throw new AppError(404, 'Payout request not found');

      if (payout.status !== 'approved') {
        throw new AppError(400, `Cannot process payout with status ${payout.status}. It must be approved first.`);
      }

      await PayoutModel.findByIdAndUpdate(payoutId, {
        status: 'processing',
        reviewedBy: adminId,
        reviewedAt: new Date()
      });
    } catch (error) {
      Logger.error('AdminService.ProcessPayout Error', error);
      throw error;
    }
  }

  async MarkPayoutAsPaid(payoutId: string, adminId: string, providerDetails?: any): Promise<void> {
    try {
      Logger.info('AdminService.MarkPayoutAsPaid', { payoutId, adminId });

      const payout = await this.db.v1.Wallet.GetPayoutById(payoutId);
      if (!payout) throw new AppError(404, 'Payout request not found');
      if (payout.status !== 'approved' && payout.status !== 'processing') {
        throw new AppError(400, `Cannot mark payout as paid with status ${payout.status}`);
      }

      await this.db.v1.Wallet.UpdatePayoutStatus(payoutId, {
        status: 'completed',
        paidBy: adminId,
        paidAt: new Date().toISOString(),
        provider: providerDetails?.provider,
        providerTransferId: providerDetails?.transferId,
        providerResponse: providerDetails?.response
      });

      // Send notification to user? 
      const notification: Partial<Entities.Notification> = {
        userId: payout.userId,
        title: 'Payout Completed',
        message: `Your payout request for $${payout.amount.toFixed(2)} has been processed and paid.`,
        redirectUrl: '/dashboard/wallet',
        fromUserId: adminId,
        type: 'member',
        isRead: false,
      };
      await this.db.v1.User.CreateNotification(notification);

    } catch (error) {
      Logger.error('AdminService.MarkPayoutAsPaid Error', error);
      throw error;
    }
  }


  // Community Management
  async GetCommunities(filters: AdminModel.AdminCommunityFilters): Promise<AdminModel.AdminCommunityListResponse> {
    try {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;
      const query: any = {};

      if (filters.search) {
        query.name = { $regex: filters.search, $options: 'i' };
      }

      const [communities, total] = await Promise.all([
        (CommunityModel.find(query) as any)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('creatorId', 'name email'),
        CommunityModel.countDocuments(query),
      ]);

      const items: AdminModel.AdminCommunityListItem[] = await Promise.all(
        communities.map(async (c: any) => ({
          id: c.id,
          name: c.name,
          creator: {
            id: c.creatorId?._id?.toString() || c.creatorId,
            name: c.creatorId?.name,
            email: c.creatorId?.email,
          },
          membersCount: await CommunityMemberModel.countDocuments({ communityId: c._id }),
          isPrivate: c.isPrivate,
          createdAt: c.createdAt,
        })),
      );

      return {
        communities: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      Logger.error('AdminService.GetCommunities Error', error);
      throw error;
    }
  }

  async GetCommunityDetails(communityId: string): Promise<AdminModel.AdminCommunityDetails> {
    try {
      const community: any = await CommunityModel.findById(communityId).populate('creatorId', 'name email');
      if (!community) throw new AppError(404, 'Community not found');

      return {
        id: community.id,
        name: community.name,
        creator: {
          id: community.creatorId?._id?.toString() || community.creatorId,
          name: community.creatorId?.name,
          email: community.creatorId?.email,
        },
        membersCount: await CommunityMemberModel.countDocuments({ communityId: community._id }),
        isPrivate: community.isPrivate,
        createdAt: community.createdAt,
        description: community.description || '',
        icon: community.icon || null,
        banner: community.banner || null,
        rules: community.rules || null,
      };
    } catch (error) {
      Logger.error('AdminService.GetCommunityDetails Error', error);
      throw error;
    }
  }

  async UpdateCommunityStatus(communityId: string, status: 'active' | 'archived' | 'verified' | 'blocked'): Promise<void> {
    try {
      // Mapping status to boolean flags for now
      const update: any = {};
      if (status === 'verified') update.isVerified = true;
      if (status === 'blocked') update.isBlocked = true;
      if (status === 'active') { // Reset flags
        update.isVerified = false; // Or true? "Active" usually means unblocked.
        update.isBlocked = false;
      }
      // Archived logic? Maybe use isPrivate?

      await CommunityModel.findByIdAndUpdate(communityId, update);
    } catch (error) {
      Logger.error('AdminService.UpdateCommunityStatus Error', error);
      throw error;
    }
  }

  async GetCommunityMembers(communityId: string): Promise<any[]> {
    // Placeholder - return list of members
    return [];
  }

  // Content Management
  async GetPosts(filters: AdminModel.AdminPostFilters): Promise<AdminModel.AdminPostListResponse> {
    try {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;
      const query: any = {};

      if (filters.search) {
        query.title = { $regex: filters.search, $options: 'i' };
      }

      if (filters.creatorId) {
        query.creatorId = filters.creatorId;
      }

      const [posts, total] = await Promise.all([
        (PostModel.find(query) as any)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('creatorId', 'name email'), // Assuming creatorId refs User
        PostModel.countDocuments(query),
      ]);

      const items: AdminModel.AdminPostListItem[] = posts.map((p: any) => ({
        id: p.id,
        title: p.title || 'Untitled',
        content: (p.content || '').substring(0, 100),
        creator: {
          id: p.creatorId?._id?.toString() || p.creatorId,
          name: p.creatorId?.name,
          email: p.creatorId?.email,
        },
        likesCount: 0, // Need LikeModel count
        commentsCount: 0, // Need CommentModel count
        createdAt: p.createdAt,
      }));

      return {
        posts: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      Logger.error('AdminService.GetPosts Error', error);
      throw error;
    }
  }

  async GetPostDetails(postId: string): Promise<AdminModel.AdminPostDetails> {
    try {
      const post: any = await PostModel.findById(postId).populate('creatorId', 'name email');
      if (!post) throw new AppError(404, 'Post not found');

      return {
        id: post.id,
        title: post.title || 'Untitled',
        content: (post.content || '').substring(0, 100),
        fullContent: post.content || '',
        creator: {
          id: post.creatorId?._id?.toString() || post.creatorId,
          name: post.creatorId?.name,
          email: post.creatorId?.email,
        },
        likesCount: 0,
        commentsCount: 0,
        createdAt: post.createdAt,
        mediaFiles: post.mediaFiles?.map((m: any) => m.url) || [],
      };
    } catch (error) {
      Logger.error('AdminService.GetPostDetails Error', error);
      throw error;
    }
  }

  async DeletePost(postId: string): Promise<void> {
    try {
      await PostModel.findByIdAndDelete(postId);
    } catch (error) {
      Logger.error('AdminService.DeletePost Error', error);
      throw error;
    }
  }

  async GetComments(filters: AdminModel.AdminCommentFilters): Promise<AdminModel.AdminCommentListResponse> {
    try {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;
      const query: any = {};

      if (filters.search) {
        query.content = { $regex: filters.search, $options: 'i' };
      }

      const [comments, total] = await Promise.all([
        (CommentModel.find(query) as any)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('userId', 'name email')
          .populate('postId', 'title'),
        CommentModel.countDocuments(query),
      ]);

      const items: AdminModel.AdminCommentListItem[] = comments.map((c: any) => ({
        id: c.id,
        content: c.content,
        creator: {
          id: c.userId?._id?.toString() || c.userId,
          name: c.userId?.name,
          email: c.userId?.email,
        },
        postId: c.postId?._id?.toString() || c.postId,
        postTitle: c.postId?.title || 'Unknown Post',
        createdAt: c.createdAt,
      }));

      return {
        comments: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      Logger.error('AdminService.GetComments Error', error);
      throw error;
    }
  }

  async DeleteComment(commentId: string): Promise<void> {
    try {
      await CommentModel.findByIdAndDelete(commentId);
    } catch (error) {
      Logger.error('AdminService.DeleteComment Error', error);
      throw error;
    }
  }

  // Report Management
  async GetReports(filters: AdminModel.AdminReportFilters): Promise<AdminModel.AdminReportListResponse> {
    try {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;
      const query: any = {};

      if (filters.status) {
        query.status = filters.status;
      }

      const [reports, total] = await Promise.all([
        (CommunityReportModel.find(query) as any)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('reporterId', 'name')
          .populate('communityId', 'name'), // Assuming communityId refs Community
        CommunityReportModel.countDocuments(query),
      ]);

      const items: AdminModel.AdminReportListItem[] = reports.map((r: any) => ({
        id: r.id,
        communityId: r.communityId?._id?.toString() || r.communityId,
        reporterId: r.reporterId?._id?.toString() || r.reporterId,
        reporterName: r.reporterId?.name || 'Unknown',
        targetId: r.targetId,
        targetType: r.targetType,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
      }));

      return {
        reports: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      Logger.error('AdminService.GetReports Error', error);
      throw error;
    }
  }

  async ResolveReport(reportId: string, action: string, notes?: string): Promise<void> {
    try {
      const status = action === 'dismiss' ? 'dismissed' : 'resolved';
      await CommunityReportModel.findByIdAndUpdate(reportId, { status, resolutionNotes: notes });
    } catch (error) {
      Logger.error('AdminService.ResolveReport Error', error);
      throw error;
    }
  }


  // Wallet & Finance Management
  async GetWallets(filters: AdminModel.AdminWalletFilters): Promise<AdminModel.AdminWalletListResponse> {
    try {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;
      const query: any = {};

      if (filters.search) {
        // Search by user name or email requires lookup or aggregation if filtering on Wallet directly.
        // But Wallet has userId. We can find users first.
        const users = await UserModel.find({
          $or: [
            { name: { $regex: filters.search, $options: 'i' } },
            { email: { $regex: filters.search, $options: 'i' } }
          ]
        }).select('_id');
        const userIds = users.map(u => u._id);
        query.userId = { $in: userIds };
      }

      if (filters.minBalance !== undefined) {
        query.usdBalance = { $gte: filters.minBalance };
      }
      if (filters.maxBalance !== undefined) {
        if (!query.usdBalance) query.usdBalance = {};
        query.usdBalance.$lte = filters.maxBalance;
      }

      const [wallets, total] = await Promise.all([
        (WalletModel.find(query) as any)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('userId', 'name email'),
        WalletModel.countDocuments(query),
      ]);

      const items: AdminModel.AdminWalletListItem[] = wallets.map((w: any) => ({
        id: w.id,
        userId: w.userId?._id?.toString() || w.userId,
        userName: w.userId?.name,
        userEmail: w.userId?.email,
        usdBalance: w.usdBalance,
        coinBalance: w.coinBalance,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      }));

      return {
        wallets: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      Logger.error('AdminService.GetWallets Error', error);
      throw error;
    }
  }

  async GetWalletDetails(walletId: string): Promise<AdminModel.AdminWalletDetails> {
    try {
      const wallet: any = await WalletModel.findById(walletId).populate('userId', 'name email');
      if (!wallet) throw new AppError(404, 'Wallet not found');

      // Get recent transactions
      const transactions = await WalletTransactionModel.find({ walletId: wallet._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('relatedUserId', 'name email');

      const txItems: AdminModel.AdminTransactionListItem[] = transactions.map((t: any) => ({
        id: t.id,
        user: {
          id: t.relatedUserId?._id?.toString() || t.relatedUserId,
          name: t.relatedUserId?.name,
          email: t.relatedUserId?.email
        },
        amount: t.amount,
        status: t.status,
        createdAt: t.createdAt
      }));

      // Get recent payouts
      const payouts = await PayoutModel.find({ userId: wallet.userId?._id })
        .sort({ createdAt: -1 })
        .limit(5);

      const payoutItems: AdminModel.AdminPayoutListItem[] = payouts.map((p: any) => ({
        id: p.id,
        userId: p.userId.toString(),
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt
      }));

      return {
        id: wallet.id,
        userId: wallet.userId?._id?.toString() || wallet.userId,
        userName: wallet.userId?.name,
        userEmail: wallet.userId?.email,
        usdBalance: wallet.usdBalance,
        coinBalance: wallet.coinBalance,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
        transactions: txItems,
        payouts: payoutItems,
      };
    } catch (error) {
      Logger.error('AdminService.GetWalletDetails Error', error);
      throw error;
    }
  }

  async CreditDebitWallet(walletId: string, data: AdminModel.AdminCreditDebitDto, adminId: string): Promise<void> {
    try {
      const wallet = await WalletModel.findById(walletId);
      if (!wallet) throw new AppError(404, 'Wallet not found');

      const { amount, currency, reason, type } = data;
      const isCredit = type === 'CREDIT';

      // Update balance
      const balanceField = currency === 'COIN' ? 'coinBalance' : 'usdBalance';
      const increment = isCredit ? amount : -amount;

      // Check sufficient funds for debit
      if (!isCredit && wallet[balanceField] < amount) {
        throw new AppError(400, 'Insufficient funds for debit');
      }

      await WalletModel.findByIdAndUpdate(walletId, { $inc: { [balanceField]: increment } });

      // Create transaction record
      await WalletTransactionModel.create({
        walletId: wallet._id,
        type: 'ADJUSTMENT',
        amount,
        currency,
        status: 'COMPLETED',
        metadata: {
          reason,
          adminId,
          action: type,
          originalBalance: wallet[balanceField],
          newBalance: wallet[balanceField] + increment
        }
      });

    } catch (error) {
      Logger.error('AdminService.CreditDebitWallet Error', error);
      throw error;
    }
  }

  async RefundTransaction(transactionId: string, adminId: string, reason: string): Promise<void> {
    try {
      const tx: any = await WalletTransactionModel.findById(transactionId);
      if (!tx) throw new AppError(404, 'Transaction not found');
      if (tx.status !== 'COMPLETED') throw new AppError(400, 'Cannot refund incomplete transaction');
      if (tx.type === 'REFUND') throw new AppError(400, 'Cannot refund a refund');

      // Logic depends on transaction type.
      // For simplicity, we reverse the balance impact on the Wallet.
      // If it was DEPOSIT (Money IN), Refund means Withdraw (Money OUT).
      // If it was WITHDRAWAL (Money OUT), Refund means Deposit (Money IN).

      // Determine direction
      let isCredit = false; // Default: Transaction added money, so Refund removes it?
      // Wait, usually "Refund" means giving money BACK to the user.
      // If User PURCHASED COINS (Type=PURCHASE_COINS), they spent money (external) and got Coins.
      // Refund here might mean "Take back coins, give back money".
      // If User SPENT COINS on Product (Type=PRODUCT_SALE but for the Buyer it's PURCHASE?),
      // Let's assume Refund = Reverse the money flow for the Wallet Owner.

      // If Tx.type is negative flow (WITHDRAWAL, GIFT_SEND, PURCHASE?), then Refund = Credit.
      // If Tx.type is positive flow (DEPOSIT, GIFT_RECEIVE, PRODUCT_SALE), then Refund = Debit.

      const negativeTypes = ['WITHDRAWAL', 'GIFT_SEND', 'PURCHASE_COINS']; // Money left wallet (or coins left)
      const positiveTypes = ['DEPOSIT', 'GIFT_RECEIVE', 'PRODUCT_SALE', 'REFUND']; // Money entered wallet

      if (positiveTypes.includes(tx.type)) {
        // It was a credit. Refund = Debit.
        isCredit = false;
      } else {
        // It was a debit. Refund = Credit.
        isCredit = true;
      }

      const wallet = await WalletModel.findById(tx.walletId);
      if (!wallet) throw new AppError(404, 'Wallet not found');

      const balanceField = tx.currency === 'COIN' ? 'coinBalance' : 'usdBalance';
      const amount = tx.amount;

      if (!isCredit && wallet[balanceField] < amount) {
        throw new AppError(400, 'Insufficient funds to process refund (debit)');
      }

      await WalletModel.findByIdAndUpdate(tx.walletId, { $inc: { [balanceField]: isCredit ? amount : -amount } });

      await WalletTransactionModel.create({
        walletId: tx.walletId,
        type: 'REFUND',
        amount,
        currency: tx.currency,
        status: 'COMPLETED',
        relatedUserId: tx.relatedUserId,
        metadata: {
          originalTransactionId: tx._id,
          reason,
          adminId
        }
      });

    } catch (error) {
      Logger.error('AdminService.RefundTransaction Error', error);
      throw error;
    }
  }


  // System & Integrations
  async GetLinkInBioProfiles(filters: AdminModel.AdminLinkInBioFilters): Promise<AdminModel.AdminLinkInBioListResponse> {
    try {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;
      const query: any = {};

      if (filters.search) {
        query.username = { $regex: filters.search, $options: 'i' };
      }

      const [profiles, total] = await Promise.all([
        LinkInBioProfileModel.find(query)
          .sort({ updatedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        LinkInBioProfileModel.countDocuments(query),
      ]);

      const items: AdminModel.AdminLinkInBioListItem[] = profiles.map((p: any) => ({
        id: p.id,
        username: p.username,
        userId: p.userId,
        displayName: p.displayName,
        isPublished: p.isPublished,
        theme: p.theme,
        updatedAt: p.updatedAt,
      }));

      return {
        profiles: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      Logger.error('AdminService.GetLinkInBioProfiles Error', error);
      throw error;
    }
  }

  async DeleteLinkInBioProfile(profileId: string): Promise<void> {
    try {
      // Soft delete / unpublish
      await LinkInBioProfileModel.findByIdAndUpdate(profileId, { isPublished: false, isActive: false });
    } catch (error) {
      Logger.error('AdminService.DeleteLinkInBioProfile Error', error);
      throw error;
    }
  }

  async GetSystemAdmins(): Promise<AdminModel.AdminSystemAdminListResponse> {
    try {
      const admins = await AdminAuthModel.find({}).sort({ createdAt: -1 });
      const items = admins.map((a: any) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        role: a.role,
        createdAt: a.createdAt
      }));
      return { admins: items };
    } catch (error) {
      Logger.error('AdminService.GetSystemAdmins Error', error);
      throw error;
    }
  }

  async InviteAdmin(data: AdminModel.AdminInviteAdminDto): Promise<void> {
    try {
      const { email, name, password } = data;
      const existing = await AdminAuthModel.findOne({ email });
      if (existing) throw new AppError(400, 'Admin with this email already exists');

      const hashedPassword = await bcrypt.hash(password || 'Admin123!', 10);

      await AdminAuthModel.create({
        email,
        name,
        password: hashedPassword,
        role: 'admin'
      });
    } catch (error) {
      Logger.error('AdminService.InviteAdmin Error', error);
      throw error;
    }
  }

  async RemoveAdmin(adminId: string): Promise<void> {
    try {
      await AdminAuthModel.findByIdAndDelete(adminId);
    } catch (error) {
      Logger.error('AdminService.RemoveAdmin Error', error);
      throw error;
    }
  }

  // Marketplace & Payments
  async GetGlobalTransactions(filters: AdminModel.AdminGlobalTransactionFilters): Promise<AdminModel.AdminGlobalTransactionListResponse> {
    try {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;
      const query: any = {};

      if (filters.status) query.status = filters.status;
      if (filters.type) query.transactionType = filters.type;

      const [transactions, total] = await Promise.all([
        (TransactionModel.find(query) as any)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('creatorId', 'name email')
          .populate('subscriberId', 'name email'),
        TransactionModel.countDocuments(query),
      ]);

      const items = transactions.map((tx: any) => ({
        id: tx.id,
        creator: tx.creatorId ? { id: (tx.creatorId as any).id, name: (tx.creatorId as any).name, email: (tx.creatorId as any).email } : { id: 'unknown', name: 'Unknown', email: 'unknown' },
        subscriber: tx.subscriberId ? { id: (tx.subscriberId as any).id, name: (tx.subscriberId as any).name, email: (tx.subscriberId as any).email } : { id: 'unknown', name: 'Unknown', email: 'unknown' },
        amount: tx.amount,
        currency: tx.currency,
        transactionType: tx.transactionType,
        status: tx.status,
        createdAt: tx.createdAt,
      }));

      return {
        transactions: items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
      };
    } catch (error) {
      Logger.error('AdminService.GetGlobalTransactions Error', error);
      throw error;
    }
  }

  async GetProducts(filters: AdminModel.AdminProductFilters): Promise<AdminModel.AdminProductListResponse> {
    try {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;
      const query: any = {};

      if (filters.productType) query.productType = filters.productType;
      if (filters.search) query.name = { $regex: filters.search, $options: 'i' };

      const [products, total] = await Promise.all([
        (ProductModel.find(query) as any)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('creatorId', 'name email'),
        ProductModel.countDocuments(query),
      ]);

      const items = products.map((p: any) => ({
        id: p.id,
        name: p.name,
        creator: p.creatorId ? { id: (p.creatorId as any).id, name: (p.creatorId as any).name, email: (p.creatorId as any).email } : { id: 'unknown', name: 'Unknown', email: 'unknown' },
        price: p.price,
        productType: p.productType,
        stockQuantity: p.stockQuantity,
        isActive: p.isActive,
        createdAt: p.createdAt,
      }));

      return {
        products: items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
      };
    } catch (error) {
      Logger.error('AdminService.GetProducts Error', error);
      throw error;
    }
  }

  async UpdateProductStatus(productId: string, isActive: boolean): Promise<void> {
    try {
      await ProductModel.findByIdAndUpdate(productId, { isActive });
    } catch (error) {
      Logger.error('AdminService.UpdateProductStatus Error', error);
      throw error;
    }
  }

  async GetOrders(filters: AdminModel.AdminOrderFilters): Promise<AdminModel.AdminOrderListResponse> {
    try {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;
      const query: any = {};

      if (filters.status) query.status = filters.status;
      if (filters.search) query.orderId = { $regex: filters.search, $options: 'i' };

      const [orders, total] = await Promise.all([
        (OrderModel.find(query) as any)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('creatorId', 'name email')
          .populate('userId', 'name email'),
        OrderModel.countDocuments(query),
      ]);

      const items = orders.map((o: any) => ({
        id: o.id,
        orderId: o.orderId,
        creator: o.creatorId ? { id: (o.creatorId as any).id, name: (o.creatorId as any).name, email: (o.creatorId as any).email } : { id: 'unknown', name: 'Unknown', email: 'unknown' },
        user: o.userId ? { id: (o.userId as any).id, name: (o.userId as any).name, email: (o.userId as any).email } : null,
        amount: o.amount,
        status: o.status,
        createdAt: o.createdAt,
      }));

      return {
        orders: items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
      };
    } catch (error) {
      Logger.error('AdminService.GetOrders Error', error);
      throw error;
    }
  }

  async GetOrderDetails(orderId: string): Promise<AdminModel.AdminOrderDetails> {
    try {
      const order = await OrderModel.findById(orderId)
        .populate('creatorId', 'name email')
        .populate('userId', 'name email')
        .populate('productId', 'name');

      if (!order) throw new AppError(404, 'Order not found');

      return {
        id: order.id,
        orderId: (order as any).orderId,
        creator: (order as any).creatorId ? { id: (order as any).creatorId.id, name: (order as any).creatorId.name, email: (order as any).creatorId.email } : { id: 'unknown', name: 'Unknown', email: 'unknown' },
        user: (order as any).userId ? { id: (order as any).userId.id, name: (order as any).userId.name, email: (order as any).userId.email } : null,
        amount: (order as any).amount,
        status: (order as any).status,
        createdAt: (order as any).createdAt,
        shippingAddress: (order as any).shippingAddress,
        trackingNumber: (order as any).trackingNumber,
        escrowStatus: (order as any).escrowStatus,
        escrowReleaseAt: (order as any).escrowReleaseAt,
        product: (order as any).productId ? { id: (order as any).productId.id, name: (order as any).productId.name } : { id: 'unknown', name: 'Unknown' },
      };
    } catch (error) {
      Logger.error('AdminService.GetOrderDetails Error', error);
      throw error;
    }
  }

  async ReleaseEscrow(orderId: string, adminId: string): Promise<void> {
    try {
      const order = await OrderModel.findById(orderId);
      if (!order) throw new AppError(404, 'Order not found');
      if (order.escrowStatus !== 'held') throw new AppError(400, 'Order escrow is not in held status');

      // Release logic
      // 1. Mark order as released
      order.escrowStatus = 'released';
      order.escrowReleasedAt = new Date().toISOString() as any;
      await order.save();

      // 2. Credit Creator Wallet
      const wallet = await WalletModel.findOne({ userId: (order as any).creatorId });
      if (!wallet) throw new AppError(404, 'Creator wallet not found');

      await WalletModel.findByIdAndUpdate(wallet.id, { $inc: { usdBalance: (order as any).amount } });

      // 3. Record Transaction
      await WalletTransactionModel.create({
        walletId: wallet.id,
        type: 'PRODUCT_SALE',
        amount: (order as any).amount,
        currency: 'USD',
        status: 'COMPLETED',
        orderId: orderId,
        metadata: {
          note: 'Escrow released manually by admin',
          adminId
        }
      });
    } catch (error) {
      Logger.error('AdminService.ReleaseEscrow Error', error);
      throw error;
    }
  }

  // Settings & Metadata
  async GetCategories(): Promise<AdminModel.AdminCategory[]> {
    try {
      const categories = await CategoryModel.find({}).sort({ name: 1 });
      return categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        parentId: c.parentId,
        createdAt: c.createdAt
      }));
    } catch (error) {
      Logger.error('AdminService.GetCategories Error', error);
      throw error;
    }
  }

  async CreateCategory(data: AdminModel.AdminCreateCategoryDto): Promise<AdminModel.AdminCategory> {
    try {
      const c = await CategoryModel.create(data);
      return {
        id: c.id,
        name: c.name,
        parentId: c.parentId,
        createdAt: (c as any).createdAt
      };
    } catch (error) {
      Logger.error('AdminService.CreateCategory Error', error);
      throw error;
    }
  }

  async UpdateCategory(categoryId: string, name: string): Promise<void> {
    try {
      await CategoryModel.findByIdAndUpdate(categoryId, { name });
    } catch (error) {
      Logger.error('AdminService.UpdateCategory Error', error);
      throw error;
    }
  }

  async DeleteCategory(categoryId: string): Promise<void> {
    try {
      await CategoryModel.findByIdAndDelete(categoryId);
    } catch (error) {
      Logger.error('AdminService.DeleteCategory Error', error);
      throw error;
    }
  }
}


