import { PASSWORD_REGEX } from '../../../../helpers/contants';
import { z } from 'zod';

export const zodPasswordValidation = z.string();

export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: zodPasswordValidation,
});

export type LoginBody = z.infer<typeof LoginBodySchema>;

export const RequestOTPBodySchema = z.object({
  email: z.string().email(),
});

export type RequestOTPBody = z.infer<typeof RequestOTPBodySchema>;

export const RecoverPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  password: zodPasswordValidation,
});

export type RecoverPassword = z.infer<typeof RecoverPasswordSchema>;

// New types to fix linter errors
export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const UserRegistrationSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  password: zodPasswordValidation,
  creatorName: z.string().optional(),
  is18Plus: z.boolean().optional(),
  pageName: z.string().optional(),
});

export type UserRegistration = z.infer<typeof UserRegistrationSchema>;

export interface AdminLoginModel {
  email: string;
  password: string;
}

export interface GoogleLoginModel {
  email: string;
  password: string;
  confirmPassword: string;
  profileImage?: string;
  socialLogin?: boolean;
}

export const LoginWithRefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export type LoginWithRefreshToken = z.infer<typeof LoginWithRefreshTokenSchema>;
