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
}


