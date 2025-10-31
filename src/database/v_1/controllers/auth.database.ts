/* eslint-disable @typescript-eslint/no-explicit-any */
//
import { Knex } from 'knex';
import { Entities } from '../../../helpers';
import { AppError } from '../../../helpers/errors';
import { Logger } from '../../../helpers/logger';
import { DatabaseErrors } from '../../../helpers/contants';

export class AuthDatabase {
  private logger: typeof Logger;

  private GetKnex: () => Knex;

  private RunQuery: (query: Knex.QueryBuilder) => Promise<{ res?: any[]; err: any }>;

  public constructor(args: {
    GetKnex: () => Knex;
    RunQuery: (query: Knex.QueryBuilder) => Promise<{ res?: any[]; err: any }>;
  }) {
    this.logger = Logger;
    this.GetKnex = args.GetKnex;
    this.RunQuery = args.RunQuery;
  }

  async CreateUser(user: Partial<Entities.User>): Promise<string | undefined> {
    this.logger.info('Db.CreateUser', { user });

    const knexdb = this.GetKnex();

    const query = knexdb('users').insert(user, 'id');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      if (err.code === DatabaseErrors.DUPLICATE) {
        this.logger.error('Db.CreateUser failed due to duplicate key', err);

        throw new AppError(400, 'User already exists');
      }
      throw new AppError(400, `User not created ${err}`);
    }

    if (!res || res.length !== 1) {
      this.logger.info('Db.CreateUser User not created', err);

      throw new AppError(400, `User not created `);
    }

    const { id } = res[0];
    return id;
  }

  async DeleteSession(where: Partial<Entities.verifyOtp>): Promise<void> {
    this.logger.info('Db.DeleteSession', { where });

    const knexdb = this.GetKnex();

    const query = knexdb('verifySession').where(where).del();

    const { err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.verifySession Error deleting session', err);
      throw new AppError(500, 'Error deleting verifySession');
    }
  }

  async GetSession(where: Partial<Entities.verifyOtp>): Promise<Entities.verifyOtp | undefined> {
    this.logger.info('Db.GetSession', { where });

    const knexdb = this.GetKnex();

    const TenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const query = knexdb('verifySession').select('*').where(where).where('createdAt', '>', TenMinutesAgo);

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.verifySession Error getting session', err);
      return undefined;
    }

    if (!res || res.length === 0) {
      this.logger.info('Db.verifySession No valid session found');

      return undefined;
    }

    return res[0];
  }

  async StoreSessionToken(data: Partial<Entities.verifyOtp>): Promise<void> {
    this.logger.info('Db.StoreSessionToken', { data });

    const knexdb = this.GetKnex();

    // Delete any existing OTP sessions for this user
    await this.DeleteSession({ userId: data.userId });

    const query = knexdb('verifySession').insert(data, ['id']);

    const { err } = await this.RunQuery(query);

    if (err) {
      throw new AppError(400, `Session not created  ${err}`);
    }
  }
}
