import { Db } from '../../../../database/db';
import { AppError } from '../../../../helpers/errors';
import { Logger } from '../../../../helpers/logger';
import { Entities, Hash } from '../../../../helpers';
import * as Token from '../../../../helpers/token';
import { generateRandomOTP } from '../../../../helpers/generateRandomOTP';
import { EmailService } from '../../../../helpers/email';
import * as AuthModel from '../models/auth.model';
import { hashPassword } from '../../../../helpers/hash';
import { GoogleUserInfo, handleGoogleCallback } from '../../../../helpers/googleAuth';

export class AuthService {
  private db: Db;
  private emailService: EmailService;

  constructor(args: { db: Db }) {
    Logger.info('AuthService initialized...');
    this.db = args.db;
    this.emailService = new EmailService();
  }

  async CreateUser(data: AuthModel.UserRegistration): Promise<AuthModel.Tokens | undefined> {
    Logger.info('AuthService.CreateUser', { data });

    let password = await hashPassword(data.password);
    data.password = password;

    const user = await this.db.v1.Auth.CreateUser(data);
    if (!user) return undefined;

    const dataForToken = { id: user };

    const accessToken = Token.createAccessToken(dataForToken);
    const refreshToken = Token.createRefreshToken(dataForToken);

    const token: AuthModel.Tokens = {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };

    // Send welcome email (non-blocking)
    try {
      const { FrontEndLink } = await import('../../../../helpers/env');
      await this.emailService.SendWelcomeEmail(
        data.email,
        data.name,
        FrontEndLink.FRONT_END_LINK || 'https://truefans.ng'
      );
    } catch (error) {
      Logger.error('Failed to send welcome email', error);
      // Don't fail registration if email fails
    }

    return token;
  }

  async Login(
    email: string,
    password: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    Logger.info('AuthService.CheckLoginOtp', { email, password });

    const fetchedUser = await this.db.v1.User.GetUserByEmail(email);

    if (!fetchedUser) throw new AppError(400, 'User not found');

    if (!fetchedUser.password) throw new AppError(500, 'No password found for user');

    const isCorrectPassword = await Hash.verifyPassword(password, fetchedUser.password);

    if (!isCorrectPassword) throw new AppError(400, 'Invalid credentials');

    const accessToken = Token.createAccessToken({ id: fetchedUser.id });
    const refreshToken = Token.createRefreshToken({ id: fetchedUser.id });

    const token: AuthModel.Tokens = {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
    return token;
  }

  async SendOtp(email: string): Promise<void> {
    Logger.info('AuthService.SendOtp', { email });

    const fetchedUser = await this.db.v1.User.GetUserByEmail(email);

    if (!fetchedUser) throw new AppError(400, 'User does not exist');

    // Generate 6-digit OTP
    const otp = generateRandomOTP(6);

    // Store OTP in verifySession table (old sessions for this user will be deleted automatically)
    await this.db.v1.Auth.StoreSessionToken({ userId: fetchedUser.id, otp: otp });

    // Send OTP via email
    await this.emailService.SendMail(email, otp);
  }

  async VerifyAndUpdate(email: string, otp: string, password: string): Promise<void> {
    Logger.info('AuthService.VerifyAndUpdate', { email, otp });

    // Get user by email
    const fetchedUser = await this.db.v1.User.GetUserByEmail(email);

    if (!fetchedUser) throw new AppError(400, 'User does not exist');

    // Get session with OTP for this user (GetSession filters by userId and otp, and checks expiration)
    const fetchedSession = await this.db.v1.Auth.GetSession({ userId: fetchedUser.id, otp: otp });

    if (!fetchedSession) throw new AppError(400, 'Invalid or expired OTP');

    // Delete the session after successful verification
    await this.db.v1.Auth.DeleteSession({ id: fetchedSession.id });

    // Hash and update password
    const hashedPassword = await hashPassword(password);

    await this.db.v1.User.UpdateUser(fetchedSession.userId, { password: hashedPassword });

    // Send password changed email (non-blocking)
    try {
      const { FrontEndLink } = await import('../../../../helpers/env');
      await this.emailService.SendPasswordChangedEmail(
        email,
        'Unknown', // IP address not available in this context
        `${FrontEndLink.FRONT_END_LINK || 'https://truefans.ng'}/support`
      );
    } catch (error) {
      Logger.error('Failed to send password changed email', error);
    }
  }

  async ValidateRefreshToken(refreshToken: string): Promise<AuthModel.Tokens> {
    Logger.info('AuthService.ValidateRefreshToken', { refreshToken });

    const data = Token.verifyRefreshToken(refreshToken);

    Logger.info('AuthService.ValidateRefreshToken', { data });

    if (!data?.id) {
      throw new AppError(400, 'Invalid refresh token');
    }

    const fetchedUser = await this.db.v1.User.GetUser({ id: data.id });

    if (!fetchedUser) throw new AppError(400, 'User not found');

    const dataForToken = { id: data.id };

    const accessToken = Token.createAccessToken(dataForToken);
    const newRefreshToken = Token.createRefreshToken(dataForToken);

    const token: AuthModel.Tokens = {
      accessToken: accessToken,
      refreshToken: newRefreshToken,
    };

    return token;
  }

  public async GetLoginAdmin(admin: AuthModel.AdminLoginModel): Promise<AuthModel.Tokens> {
    Logger.info('AuthService.GetLoginAdmin', { admin });

    const fetchedAdmin = await this.db.v1.Admin.GetAdmin({ email: admin.email });

    if (!fetchedAdmin) throw new AppError(400, 'Admin not found');

    if (!fetchedAdmin.password) throw new AppError(500, 'No password found for admin');

    const isCorrectPassword = await Hash.verifyPassword(admin.password, fetchedAdmin.password);

    if (!isCorrectPassword) throw new AppError(400, 'Invalid credentials');

    const dataForToken = { id: fetchedAdmin.id! };

    const accessToken = Token.createAccessToken(dataForToken);

    const refreshToken = Token.createRefreshToken(dataForToken);

    const token: AuthModel.Tokens = {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };

    return token;
  }
}
