import { Knex } from 'knex';
import { AppError } from '../../../helpers/errors';
import { Logger } from '../../../helpers/logger';
import { Entities } from '../../../helpers';

type QueryRunner = (query: Knex.QueryBuilder) => Promise<{ res?: any[]; err: unknown }>;

export class AdminDatabase {
  private logger = Logger;

  private GetKnex: () => Knex;

  private RunQuery: QueryRunner;

  constructor(args: { GetKnex: () => Knex; RunQuery: QueryRunner }) {
    this.GetKnex = args.GetKnex;
    this.RunQuery = args.RunQuery;
  }

  async GetAdmin(where: Partial<Entities.Admin>): Promise<Entities.Admin | null> {
    this.logger.info('Db.GetAdmin', { where });

    const knexdb = this.GetKnex();

    const query = knexdb('admin').where(where);

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetAdmin failed', err);
      throw new AppError(400, 'Admin not found');
    }

    if (!res || res.length === 0) {
      this.logger.info('Db.GetAdmin Admin not found');
      return null;
    }

    return res[0] as Entities.Admin;
  }

  async CreateAdmin(admin: Partial<Entities.Admin>): Promise<Entities.Admin> {
    this.logger.info('Db.CreateAdmin', { admin });

    const knexdb = this.GetKnex();

    const query = knexdb('admin').insert(admin);

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.CreateAdmin failed', err);
      throw new AppError(400, 'Admin not created');
    }

    if (!res || res.length === 0) {
      this.logger.info('Db.CreateAdmin Admin not created');
      throw new AppError(400, 'Admin not created');
    }

    return res[0] as Entities.Admin;
  }

  async GetTransactionsWithFilters(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{
    transactions: Array<{
      id: string;
      amount: string;
      status: string;
      createdAt: string;
      userId: string;
      userName: string | null;
      userEmail: string | null;
    }>;
    total: number;
  }> {
    const { page = 1, limit = 10, search, status } = params;

    this.logger.info('Db.GetTransactionsWithFilters', { page, limit, search, status });

    const knexdb = this.GetKnex();

    const baseQuery = knexdb('transactions as t')
      .leftJoin('users as u', 't.subscriberId', 'u.id');

    if (search) {
      baseQuery.andWhere(function () {
        this.whereILike('u.name', `%${search}%`).orWhereILike('u.email', `%${search}%`);
      });
    }

    if (status) {
      baseQuery.andWhere('t.status', status);
    }

    const transactionsQuery = baseQuery
      .clone()
      .select([
        't.id',
        't.amount',
        't.status',
        't.createdAt',
        'u.id as userId',
        'u.name as userName',
        'u.email as userEmail',
      ])
      .orderBy('t.createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const countQuery = baseQuery.clone().clearSelect().clearOrder().count({ total: 't.id' });

    const [{ res: transactionsRes, err: transactionsErr }, { res: countRes, err: countErr }] = await Promise.all([
      this.RunQuery(transactionsQuery),
      this.RunQuery(countQuery),
    ]);

    if (transactionsErr) {
      this.logger.error('Db.GetTransactionsWithFilters failed fetching transactions', transactionsErr);
      throw new AppError(400, 'Failed to fetch transactions');
    }

    if (countErr) {
      this.logger.error('Db.GetTransactionsWithFilters failed counting transactions', countErr);
      throw new AppError(400, 'Failed to fetch transactions count');
    }

    const total = parseInt(countRes?.[0]?.total ?? '0', 10);

    return {
      transactions: (transactionsRes ?? []) as Array<{
        id: string;
        amount: string;
        status: string;
        createdAt: string;
        userId: string;
        userName: string | null;
        userEmail: string | null;
      }>,
      total,
    };
  }

  async GetTicketsWithFilters(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: Entities.TicketStatus;
    ticketId?: string;
  }): Promise<{
    tickets: Array<{
      id: string;
      subject: string;
      message: string;
      status: Entities.TicketStatus;
      createdAt: string;
      updatedAt: string;
      userId: string;
      userName: string | null;
      userEmail: string | null;
      comments: Array<{
        id: string;
        ticketId: string;
        comment: string;
        adminId: string | null;
        adminName: string | null;
        createdAt: string;
      }>;
    }>;
    total: number;
  }> {
    const { page = 1, limit = 10, search, status, ticketId } = params;

    this.logger.info('Db.GetTicketsWithFilters', { page, limit, search, status });

    const knexdb = this.GetKnex();

    const baseQuery = knexdb('tickets as t')
      .leftJoin('users as u', 't.userId', 'u.id');

    if (ticketId) {
      baseQuery.andWhere('t.id', ticketId);
    }

    if (search) {
      baseQuery.andWhere(function () {
        this.whereILike('t.subject', `%${search}%`)
          .orWhereILike('u.email', `%${search}%`)
          .orWhereILike('u.name', `%${search}%`);
      });
    }

    if (status) {
      baseQuery.andWhere('t.status', status);
    }

    const ticketsQuery = baseQuery
      .clone()
      .select([
        't.id',
        't.subject',
        't.message',
        't.status',
        't.createdAt',
        't.updatedAt',
        'u.id as userId',
        'u.name as userName',
        'u.email as userEmail',
      ])
      .orderBy('t.createdAt', 'desc')
      .modify((qb) => {
        if (!ticketId) {
          qb.limit(limit).offset((page - 1) * limit);
        }
      });

    const countQuery = baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct({ total: 't.id' });

    const [{ res: ticketsRes, err: ticketsErr }, { res: countRes, err: countErr }] = await Promise.all([
      this.RunQuery(ticketsQuery),
      this.RunQuery(countQuery),
    ]);

    if (ticketsErr) {
      this.logger.error('Db.GetTicketsWithFilters failed fetching tickets', ticketsErr);
      throw new AppError(400, 'Failed to fetch tickets');
    }

    if (countErr) {
      this.logger.error('Db.GetTicketsWithFilters failed counting tickets', countErr);
      throw new AppError(400, 'Failed to fetch tickets count');
    }

    const tickets = (ticketsRes ?? []) as Array<{
      id: string;
      subject: string;
      message: string;
      status: Entities.TicketStatus;
      createdAt: string;
      updatedAt: string;
      userId: string;
      userName: string | null;
      userEmail: string | null;
    }>;

    const ticketIds = tickets.map((ticket) => ticket.id);

    let commentsByTicketId: Record<
      string,
      Array<{
        id: string;
        ticketId: string;
        comment: string;
        adminId: string | null;
        adminName: string | null;
        createdAt: string;
      }>
    > = {};

    if (ticketIds.length > 0) {
      const commentsQuery = knexdb('ticketComments as tc')
        .leftJoin('admin as a', 'tc.adminId', 'a.id')
        .select([
          'tc.id',
          'tc.ticketId',
          'tc.comment',
          'tc.adminId',
          'a.name as adminName',
          'tc.createdAt',
        ])
        .whereIn('tc.ticketId', ticketIds)
        .orderBy('tc.createdAt', 'asc');

      const { res: commentsRes, err: commentsErr } = await this.RunQuery(commentsQuery);

      if (commentsErr) {
        this.logger.error('Db.GetTicketsWithFilters failed fetching comments', commentsErr);
        throw new AppError(400, 'Failed to fetch ticket comments');
      }

      commentsByTicketId = (commentsRes ?? []).reduce<
        Record<
          string,
          Array<{
            id: string;
            ticketId: string;
            comment: string;
            adminId: string | null;
            adminName: string | null;
            createdAt: string;
          }>
        >
      >((acc, comment) => {
        if (!acc[comment.ticketId]) acc[comment.ticketId] = [];
        acc[comment.ticketId].push(comment);
        return acc;
      }, {});
    }

    const total = ticketId ? tickets.length : parseInt(countRes?.[0]?.total ?? '0', 10);

    return {
      tickets: tickets.map((ticket) => ({
        ...ticket,
        comments: commentsByTicketId[ticket.id] ?? [],
      })),
      total,
    };
  }

  async CreateTicketComment(args: {
    ticketId: string;
    adminId: string | null;
    comment: string;
  }): Promise<{
    id: string;
    ticketId: string;
    comment: string;
    adminId: string | null;
    adminName: string | null;
    createdAt: string;
  }> {
    const knexdb = this.GetKnex();

    const insertQuery = knexdb('ticketComments').insert(
      {
        ticketId: args.ticketId,
        adminId: args.adminId,
        comment: args.comment,
      },
      ['id'],
    );

    const { res, err } = await this.RunQuery(insertQuery);

    if (err) {
      this.logger.error('Db.CreateTicketComment failed', err);
      throw new AppError(400, 'Failed to add ticket comment');
    }

    if (!res || res.length === 0) {
      throw new AppError(400, 'Failed to add ticket comment');
    }

    const commentId = res[0].id as string;

    const fetchQuery = knexdb('ticketComments as tc')
      .leftJoin('admin as a', 'tc.adminId', 'a.id')
      .select([
        'tc.id',
        'tc.ticketId',
        'tc.comment',
        'tc.adminId',
        'a.name as adminName',
        'tc.createdAt',
      ])
      .where('tc.id', commentId);

    const { res: commentRes, err: commentErr } = await this.RunQuery(fetchQuery);

    if (commentErr) {
      this.logger.error('Db.CreateTicketComment failed fetching comment', commentErr);
      throw new AppError(400, 'Failed to fetch ticket comment');
    }

    if (!commentRes || commentRes.length === 0) {
      throw new AppError(400, 'Failed to fetch ticket comment');
    }

    return commentRes[0] as {
      id: string;
      ticketId: string;
      comment: string;
      adminId: string | null;
      adminName: string | null;
      createdAt: string;
    };
  }

  async UpdateTicketStatus(ticketId: string, status: Entities.TicketStatus): Promise<Entities.Ticket | null> {
    const knexdb = this.GetKnex();

    const updateQuery = knexdb('tickets')
      .where({ id: ticketId })
      .update({ status, updatedAt: knexdb.fn.now() })
      .returning('*');

    const { res, err } = await this.RunQuery(updateQuery);

    if (err) {
      this.logger.error('Db.UpdateTicketStatus failed', err);
      throw new AppError(400, 'Failed to update ticket status');
    }

    if (!res || res.length === 0) {
      return null;
    }

    return res[0] as Entities.Ticket;
  }

  async CreateSystemNotification(notification: {
    title: string;
    message: string;
    adminId: string | null;
  }): Promise<{
    id: string;
  }> {
    const knexdb = this.GetKnex();

    const insertQuery = knexdb('systemNotifications').insert(notification, ['id']);

    const { res, err } = await this.RunQuery(insertQuery);

    if (err) {
      this.logger.error('Db.CreateSystemNotification failed', err);
      throw new AppError(400, 'Failed to create system notification');
    }

    if (!res || res.length === 0) {
      throw new AppError(400, 'Failed to create system notification');
    }

    return { id: res[0].id as string };
  }

  async GetSystemNotifications(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    notifications: Array<{
      id: string;
      title: string;
      message: string;
      adminId: string | null;
      adminName: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
  }> {
    const { page = 1, limit = 10, search } = params;

    this.logger.info('Db.GetSystemNotifications', { page, limit, search });

    const knexdb = this.GetKnex();

    const baseQuery = knexdb('systemNotifications as sn')
      .leftJoin('admin as a', 'sn.adminId', 'a.id');

    if (search) {
      baseQuery.andWhere(function () {
        this.whereILike('sn.title', `%${search}%`).orWhereILike('sn.message', `%${search}%`);
      });
    }

    const notificationsQuery = baseQuery
      .clone()
      .select([
        'sn.id',
        'sn.title',
        'sn.message',
        'sn.adminId',
        'a.name as adminName',
        'sn.createdAt',
        'sn.updatedAt',
      ])
      .orderBy('sn.createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const countQuery = baseQuery.clone().clearSelect().clearOrder().count({ total: 'sn.id' });

    const [{ res: notificationsRes, err: notificationsErr }, { res: countRes, err: countErr }] = await Promise.all([
      this.RunQuery(notificationsQuery),
      this.RunQuery(countQuery),
    ]);

    if (notificationsErr) {
      this.logger.error('Db.GetSystemNotifications failed fetching notifications', notificationsErr);
      throw new AppError(400, 'Failed to fetch system notifications');
    }

    if (countErr) {
      this.logger.error('Db.GetSystemNotifications failed counting notifications', countErr);
      throw new AppError(400, 'Failed to fetch system notifications count');
    }

    const total = parseInt(countRes?.[0]?.total ?? '0', 10);

    return {
      notifications: (notificationsRes ?? []) as Array<{
        id: string;
        title: string;
        message: string;
        adminId: string | null;
        adminName: string | null;
        createdAt: string;
        updatedAt: string;
      }>,
      total,
    };
  }

  async UpdateSystemNotification(
    id: string,
    data: Partial<Entities.SystemNotification>,
  ): Promise<Entities.SystemNotification | null> {
    const knexdb = this.GetKnex();

    const updateData = {
      ...data,
      updatedAt: knexdb.fn.now(),
    };

    const updateQuery = knexdb('systemNotifications').where({ id }).update(updateData).returning('*');

    const { res, err } = await this.RunQuery(updateQuery);

    if (err) {
      this.logger.error('Db.UpdateSystemNotification failed', err);
      throw new AppError(400, 'Failed to update system notification');
    }

    if (!res || res.length === 0) {
      return null;
    }

    return res[0] as Entities.SystemNotification;
  }

  async DeleteSystemNotification(id: string): Promise<void> {
    const knexdb = this.GetKnex();

    const deleteQuery = knexdb('systemNotifications').where({ id }).del();

    const { err } = await this.RunQuery(deleteQuery);

    if (err) {
      this.logger.error('Db.DeleteSystemNotification failed', err);
      throw new AppError(400, 'Failed to delete system notification');
    }
  }

  async GetSystemNotificationById(
    id: string,
  ): Promise<{
    id: string;
    title: string;
    message: string;
    adminId: string | null;
    adminName: string | null;
    createdAt: string;
    updatedAt: string;
  } | null> {
    const knexdb = this.GetKnex();

    const query = knexdb('systemNotifications as sn')
      .leftJoin('admin as a', 'sn.adminId', 'a.id')
      .select([
        'sn.id',
        'sn.title',
        'sn.message',
        'sn.adminId',
        'a.name as adminName',
        'sn.createdAt',
        'sn.updatedAt',
      ])
      .where('sn.id', id);

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetSystemNotificationById failed', err);
      throw new AppError(400, 'Failed to fetch system notification');
    }

    if (!res || res.length === 0) {
      return null;
    }

    return res[0] as {
      id: string;
      title: string;
      message: string;
      adminId: string | null;
      adminName: string | null;
      createdAt: string;
      updatedAt: string;
    };
  }

  async CreateEmailBroadcast(args: {
    subject: string;
    message: string;
    adminId: string | null;
    recipientCount: number;
  }): Promise<{ id: string }> {
    const knexdb = this.GetKnex();

    const insertQuery = knexdb('emailBroadcasts').insert(
      {
        subject: args.subject,
        message: args.message,
        adminId: args.adminId,
        recipientCount: args.recipientCount,
      },
      ['id'],
    );

    const { res, err } = await this.RunQuery(insertQuery);

    if (err) {
      this.logger.error('Db.CreateEmailBroadcast failed', err);
      throw new AppError(400, 'Failed to create email broadcast');
    }

    if (!res || res.length === 0) {
      throw new AppError(400, 'Failed to create email broadcast');
    }

    return { id: res[0].id as string };
  }

  async GetEmailBroadcastById(
    id: string,
  ): Promise<{
    id: string;
    subject: string;
    message: string;
    recipientCount: number;
    adminId: string | null;
    adminName: string | null;
    createdAt: string;
    updatedAt: string;
  } | null> {
    const knexdb = this.GetKnex();

    const query = knexdb('emailBroadcasts as eb')
      .leftJoin('admin as a', 'eb.adminId', 'a.id')
      .select([
        'eb.id',
        'eb.subject',
        'eb.message',
        'eb.recipientCount',
        'eb.adminId',
        'a.name as adminName',
        'eb.createdAt',
        'eb.updatedAt',
      ])
      .where('eb.id', id);

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetEmailBroadcastById failed', err);
      throw new AppError(400, 'Failed to fetch email broadcast');
    }

    if (!res || res.length === 0) {
      return null;
    }

    return res[0] as {
      id: string;
      subject: string;
      message: string;
      recipientCount: number;
      adminId: string | null;
      adminName: string | null;
      createdAt: string;
      updatedAt: string;
    };
  }

  async GetEmailBroadcasts(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    broadcasts: Array<{
      id: string;
      subject: string;
      message: string;
      recipientCount: number;
      adminId: string | null;
      adminName: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
  }> {
    const { page = 1, limit = 10, search } = params;

    this.logger.info('Db.GetEmailBroadcasts', { page, limit, search });

    const knexdb = this.GetKnex();

    const baseQuery = knexdb('emailBroadcasts as eb')
      .leftJoin('admin as a', 'eb.adminId', 'a.id');

    if (search) {
      baseQuery.andWhere(function () {
        this.whereILike('eb.subject', `%${search}%`).orWhereILike('eb.message', `%${search}%`);
      });
    }

    const broadcastsQuery = baseQuery
      .clone()
      .select([
        'eb.id',
        'eb.subject',
        'eb.message',
        'eb.recipientCount',
        'eb.adminId',
        'a.name as adminName',
        'eb.createdAt',
        'eb.updatedAt',
      ])
      .orderBy('eb.createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const countQuery = baseQuery.clone().clearSelect().clearOrder().count({ total: 'eb.id' });

    const [{ res: broadcastsRes, err: broadcastsErr }, { res: countRes, err: countErr }] = await Promise.all([
      this.RunQuery(broadcastsQuery),
      this.RunQuery(countQuery),
    ]);

    if (broadcastsErr) {
      this.logger.error('Db.GetEmailBroadcasts failed fetching broadcasts', broadcastsErr);
      throw new AppError(400, 'Failed to fetch email broadcasts');
    }

    if (countErr) {
      this.logger.error('Db.GetEmailBroadcasts failed counting broadcasts', countErr);
      throw new AppError(400, 'Failed to fetch email broadcasts count');
    }

    const total = parseInt(countRes?.[0]?.total ?? '0', 10);

    return {
      broadcasts: (broadcastsRes ?? []) as Array<{
        id: string;
        subject: string;
        message: string;
        recipientCount: number;
        adminId: string | null;
        adminName: string | null;
        createdAt: string;
        updatedAt: string;
      }>,
      total,
    };
  }
}

