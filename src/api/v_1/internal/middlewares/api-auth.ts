//

import { Request, Response, NextFunction } from 'express';
import * as JWT from 'jsonwebtoken';
import { Db } from '../../../../database/db';
import { Logger } from '../../../../helpers';
import { Jwt } from '../../../../helpers/env';

export const jwtAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
  all = false,
): Promise<void | Response> => {
  try {
    Logger.Logger.info('jwtAuth middleware initialized...');
    const token: string = req.headers['access-token']?.toString() || '';
    Logger.Logger.info(`jwtAuth Token: ${token}`);

    if (!token) {
      Logger.Logger.info('jwtAuth: No token provided');
      return res.status(401).json({ Error: true, Msg: 'Unauthorized' });
    }

    const decoded: any = JWT.verify(token, Jwt.JWT_SECRET || '');
    Logger.Logger.info('jwtAuth Decoded:', decoded);

    if (decoded.isRefreshToken) {
      Logger.Logger.info('jwtAuth: Token is refresh token');
      return res.status(400).json({ Error: true, Msg: 'User Token Is Invalid or Expired! ' });
    }

    const db = res.locals.db as Db;
    const userData = await db.v1.User.GetUser({ id: decoded.id });
    Logger.Logger.info(`jwtAuth User found: ${userData ? userData.id : 'null'}`);

    if (!userData) {
      Logger.Logger.info('jwtAuth: User not found in DB');
      return res.status(401).json({ Error: true, Msg: 'Invalid token' });
    }
    if (userData.isBlocked) {
      Logger.Logger.info('jwtAuth: User is blocked');
      return res.status(401).json({ Error: true, Msg: 'Unable to process this request , Please contact support' });
    }

    req.userId = decoded.id;

    next();
  } catch (error) {
    Logger.Logger.error(error);
    res.status(400).json({ Error: true, Msg: `User Token Is Invalid or Expired!4` });
  }
};
