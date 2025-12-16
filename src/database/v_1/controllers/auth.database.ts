/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entities } from '../../../helpers';
import { AppError } from '../../../helpers/errors';
import { Logger } from '../../../helpers/logger';
import { DatabaseErrors } from '../../../helpers/contants';
import { UserModel } from '../../models/User';
import { VerifySessionModel } from '../../models/Session';

export class AuthDatabase {
  private logger: typeof Logger;

  public constructor(args: any) {
    this.logger = Logger;
  }

  async CreateUser(user: Partial<Entities.User>): Promise<string | undefined> {
    this.logger.info('Db.CreateUser', { user });

    try {
      const newUser = await UserModel.create(user);
      return newUser.id;
    } catch (err: any) {
      if (err.code === 11000) {
        this.logger.error('Db.CreateUser failed due to duplicate key', err);
        throw new AppError(400, 'User already exists');
      }
      throw new AppError(400, `User not created ${err}`);
    }
  }

  async DeleteSession(where: Partial<Entities.verifyOtp>): Promise<void> {
    this.logger.info('Db.DeleteSession', { where });

    const query: any = { ...where };
    if (query.id) {
      query._id = query.id;
      delete query.id;
    }

    try {
      await VerifySessionModel.deleteMany(query);
    } catch (err) {
      this.logger.error('Db.verifySession Error deleting session', err);
      throw new AppError(500, 'Error deleting verifySession');
    }
  }

  async GetSession(where: Partial<Entities.verifyOtp>): Promise<Entities.verifyOtp | undefined> {
    this.logger.info('Db.GetSession', { where });
    // VerifySessionModel handles TTL, so we just findOne

    const query: any = { ...where };
    if (query.id) {
      query._id = query.id;
      delete query.id;
    }

    try {
      const session = await VerifySessionModel.findOne(query);
      return session ? (session.toJSON() as unknown as Entities.verifyOtp) : undefined;
    } catch (err) {
      this.logger.error('Db.verifySession Error getting session', err);
      return undefined;
    }
  }

  async StoreSessionToken(data: Partial<Entities.verifyOtp>): Promise<void> {
    this.logger.info('Db.StoreSessionToken', { data });

    try {
      await this.DeleteSession({ userId: data.userId });
      await VerifySessionModel.create(data);
    } catch (err) {
      this.logger.error('Session not created', err);
      throw new AppError(400, `Session not created  ${err}`);
    }
  }
}
