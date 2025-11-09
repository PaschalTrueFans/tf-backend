import { Db } from '../../../../database/db';
import { Logger } from '../../../../helpers/logger';
import { AppError } from '../../../../helpers/errors';
import * as AdminModel from '../models/admin.model';

export class AdminService {
  private db: Db;

  constructor(args: { db: Db }) {
    this.db = args.db;
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
          allTime: revenueData.allTime,
          currentMonth: revenueData.currentMonth,
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
}

