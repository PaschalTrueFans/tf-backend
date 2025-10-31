import * as express from 'express';
import { Response } from 'express';
import { Db } from '../../../../database/db';
import { Logger } from '../../../../helpers/logger';
import { genericError, RequestBody, RequestQuery } from '../../../../helpers/utils';
import { AppError } from '../../../../helpers/errors';
import * as AuthModel from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { getGoogleAuthUrl } from '../../../../helpers/googleAuth';
import { FrontEndLink } from '../../../../helpers/contants';

export class AuthController {
  constructor() {
    Logger.info('Auth controller initialized...');
  }

  // Register handler
  public register = async (req: RequestBody<AuthModel.UserRegistration>, res: Response): Promise<void> => {
    let body;
    try {
      await AuthModel.UserRegistrationSchema.parseAsync(req.body);
      const db = res.locals.db as Db;

      const service = new AuthService({ db });
      const response = await service.CreateUser(req.body);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Login handler
  public login = async (req: RequestBody<{ email: string; password: string }>, res: Response): Promise<void> => {
    let body;
    try {
      await AuthModel.LoginBodySchema.parseAsync(req.body);
      const db = res.locals.db as Db;

      const service = new AuthService({ db });
      const response = await service.Login(req.body.email, req.body.password);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Send email handler
  public sendEmail = async (req: RequestBody<{ email: string }>, res: Response): Promise<void> => {
    let body;
    try {
      await AuthModel.RequestOTPBodySchema.parseAsync(req.body);
      const db = res.locals.db as Db;

      const service = new AuthService({ db });
      await service.SendOtp(req.body.email);

      body = {
        message: 'OTP sent successfully to your email',
      };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  // Reset password handler
  public resetPassword = async (req: RequestBody<AuthModel.RecoverPassword>, res: Response): Promise<void> => {
    let body;
    try {
      await AuthModel.RecoverPasswordSchema.parseAsync(req.body);
      const db = res.locals.db as Db;

      const service = new AuthService({ db });
      await service.VerifyAndUpdate(req.body.email, req.body.otp, req.body.password);

      body = {
        message: 'Password reset successfully',
      };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  // Get Google auth URL handler

  // Refresh token handler
  public refreshToken = async (req: RequestBody<AuthModel.LoginWithRefreshToken>, res: Response): Promise<void> => {
    let body;
    try {
      await AuthModel.LoginWithRefreshTokenSchema.parseAsync(req.body);
      const db = res.locals.db as Db;

      const service = new AuthService({ db });
      const response = await service.ValidateRefreshToken(req.body.refreshToken);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Admin login handler
  public adminLogin = async (req: RequestBody<{ email: string; password: string }>, res: Response): Promise<void> => {
    let body;
    try {
      await AuthModel.LoginBodySchema.parseAsync(req.body);
      const db = res.locals.db as Db;

      const service = new AuthService({ db });
      const response = await service.GetLoginAdmin(req.body);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };
}
