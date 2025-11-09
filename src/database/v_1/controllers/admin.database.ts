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
}

