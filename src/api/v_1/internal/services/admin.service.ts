import { Db } from '../../../../database/db';
import { Logger } from '../../../../helpers/logger';
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
}

