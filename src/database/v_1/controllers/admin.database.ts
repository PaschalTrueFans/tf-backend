/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entities } from '../../../helpers';
import { AppError } from '../../../helpers/errors';
import { Logger } from '../../../helpers/logger';
import {
  AdminModel,
  TicketModel,
  TicketCommentModel,
  SystemNotificationModel,
  EmailBroadcastModel,
  SettingsModel
} from '../../models/Admin';
import { UserModel } from '../../models/User';
import { TransactionModel } from '../../models/Other';


export class AdminDatabase {
  private logger = Logger;

  constructor(args: any) {
  }

  async GetAdmin(where: Partial<Entities.Admin>): Promise<Entities.Admin | null> {
    const query: any = { ...where };
    // Check if 'id' key exists in the query object
    if ('id' in query) {
      // If id is falsy (undefined, null, empty) or the string 'undefined', return null immediately
      if (!query.id || query.id === 'undefined') return null;

      query._id = query.id;
      delete query.id;
    }
    const admin = await AdminModel.findOne(query).lean();
    if (!admin) return null;
    // Return lean document with password included, manually add id
    return {
      ...admin,
      id: admin._id.toString()
    } as any as Entities.Admin;
  }

  async CreateAdmin(admin: Partial<Entities.Admin>): Promise<Entities.Admin> {
    const newAdmin = await AdminModel.create(admin);
    return newAdmin.toJSON() as Entities.Admin;
  }

  async GetTransactionsWithFilters(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ transactions: any[]; total: number }> {
    const { page = 1, limit = 10, search, status } = params;
    const query: any = {};

    if (status) query.status = status;
    // Search in user name/email requires lookup which is hard for simple find queries unless aggregated.
    // For now simple implementation:

    let userIds: string[] = [];
    if (search) {
      const users = await UserModel.find({
        $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }]
      }).select('_id');
      userIds = users.map(u => u._id.toString());
      query.subscriberId = { $in: userIds };
    }

    const transactions: any[] = await TransactionModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('subscriberId', 'name email')
      .lean();

    const total = await TransactionModel.countDocuments(query);

    const formatted = transactions.map((t: any) => ({
      id: t._id.toString(),
      amount: t.amount,
      status: t.status,
      createdAt: t.createdAt,
      userId: t.subscriberId?._id?.toString() || t.subscriberId, // Handle populated vs unpopulated
      userName: t.subscriberId?.name,
      userEmail: t.subscriberId?.email
    }));

    return { transactions: formatted, total };
  }

  async GetTicketsWithFilters(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: Entities.TicketStatus;
    ticketId?: string;
  }): Promise<{ tickets: any[]; total: number }> {
    const { page = 1, limit = 10, search, status, ticketId } = params;

    const query: any = {};
    if (ticketId) query._id = ticketId;
    if (status) query.status = status;

    if (search) {
      // Search ticket subject or User
      const users = await UserModel.find({
        $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }]
      }).select('_id');
      const userIds = users.map(u => u._id.toString());

      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { userId: { $in: userIds } }
      ];
    }

    const tickets: any[] = await TicketModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email')
      .lean();

    const total = await TicketModel.countDocuments(query);

    // Populate comments manually or via virtuals
    const enriched = await Promise.all(tickets.map(async (t: any) => {
      const comments = await TicketCommentModel.find({ ticketId: t._id })
        .sort({ createdAt: 1 })
        .populate('adminId', 'name') // Assuming adminId refs User/Admin
        .lean();

      return {
        id: t._id.toString(),
        subject: t.subject,
        message: t.message,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        userId: t.userId?._id?.toString(),
        userName: t.userId?.name,
        userEmail: t.userId?.email,
        comments: comments.map((c: any) => ({
          id: c._id.toString(),
          ticketId: c.ticketId.toString(),
          comment: c.comment,
          adminId: c.adminId?._id?.toString(),
          adminName: c.adminId?.name,
          createdAt: c.createdAt
        }))
      };
    }));

    return { tickets: enriched, total };
  }

  async CreateTicketComment(args: {
    ticketId: string;
    adminId: string | null;
    comment: string;
  }): Promise<any> {
    const comment = await TicketCommentModel.create(args);
    // Populate admin
    await comment.populate('adminId', 'name');
    const c: any = comment.toJSON();

    return {
      id: c.id,
      ticketId: c.ticketId,
      comment: c.comment,
      adminId: c.adminId?.id,
      adminName: c.adminId?.name,
      createdAt: c.createdAt
    };
  }

  async UpdateTicketStatus(ticketId: string, status: Entities.TicketStatus): Promise<Entities.Ticket | null> {
    const t = await TicketModel.findByIdAndUpdate(ticketId, { status }, { new: true });
    return t as unknown as Entities.Ticket;
  }

  async CreateSystemNotification(notification: {
    title: string;
    message: string;
    adminId: string | null;
  }): Promise<{ id: string }> {
    const n = await SystemNotificationModel.create(notification);
    return { id: n._id.toString() };
  }

  async GetSystemNotifications(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ notifications: any[]; total: number }> {
    const { page = 1, limit = 10, search } = params;
    const query: any = {};
    if (search) {
      query.$or = [{ title: { $regex: search, $options: 'i' } }, { message: { $regex: search, $options: 'i' } }];
    }

    const [notifications, total] = await Promise.all([
      SystemNotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('adminId', 'name')
        .lean() as unknown as Promise<any[]>,
      SystemNotificationModel.countDocuments(query)
    ]);

    return {
      notifications: notifications.map((n: any) => ({
        id: n._id.toString(),
        title: n.title,
        message: n.message,
        adminId: n.adminId?._id?.toString(),
        adminName: n.adminId?.name,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt
      })),
      total
    };
  }

  async UpdateSystemNotification(id: string, data: Partial<Entities.SystemNotification>): Promise<Entities.SystemNotification | null> {
    const n = await SystemNotificationModel.findByIdAndUpdate(id, data, { new: true });
    return n as unknown as Entities.SystemNotification;
  }

  async DeleteSystemNotification(id: string): Promise<void> {
    await SystemNotificationModel.findByIdAndDelete(id);
  }

  async GetSystemNotificationById(id: string): Promise<any | null> {
    const n = await SystemNotificationModel.findById(id).populate('adminId', 'name').lean() as any;
    if (!n) return null;
    return {
      id: n._id.toString(),
      title: n.title,
      message: n.message,
      adminId: n.adminId?._id?.toString(),
      adminName: n.adminId?.name,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt
    };
  }

  async CreateEmailBroadcast(args: {
    subject: string;
    message: string;
    adminId: string | null;
    recipientCount: number;
  }): Promise<{ id: string }> {
    const b = await EmailBroadcastModel.create(args);
    return { id: b._id.toString() };
  }

  async GetEmailBroadcastById(id: string): Promise<any | null> {
    const b = await EmailBroadcastModel.findById(id).populate('adminId', 'name').lean() as any;
    if (!b) return null;
    return {
      id: b._id.toString(),
      subject: b.subject,
      message: b.message,
      recipientCount: b.recipientCount,
      adminId: b.adminId?._id?.toString(),
      adminName: b.adminId?.name,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    };
  }

  async GetEmailBroadcasts(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ broadcasts: any[]; total: number }> {
    const { page = 1, limit = 10, search } = params;
    const query: any = {};
    if (search) {
      query.$or = [{ subject: { $regex: search, $options: 'i' } }, { message: { $regex: search, $options: 'i' } }];
    }

    const [broadcasts, total] = await Promise.all([
      EmailBroadcastModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('adminId', 'name')
        .lean() as unknown as Promise<any[]>,
      EmailBroadcastModel.countDocuments(query)
    ]);

    return {
      broadcasts: broadcasts.map((b: any) => ({
        id: b._id.toString(),
        subject: b.subject,
        message: b.message,
        recipientCount: b.recipientCount,
        adminId: b.adminId?._id?.toString(),
        adminName: b.adminId?.name,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt
      })),
      total
    };
  }

  async GetSettings(): Promise<any | null> {
    const s = await SettingsModel.findOne().sort({ createdAt: -1 });
    return s ? s.toJSON() : null;
  }

  async UpdateSettings(platformFee: string): Promise<any> {
    const s = await SettingsModel.create({ platformFee });
    return s.toJSON();
  }
}
