import dotenv from 'dotenv';
dotenv.config();

import Process from 'process';

enum Environments {
  LOCAL = 'LOCAL',
  DEV = 'DEV',
  STAGING = 'STAGING',
  PROD = 'PROD',
}

export const Server = {
  PORT: parseInt(Process.env.PORT as string) || 8000,
  ENVIRONMENT: Process.env.ENV as Environments,
  IS_DEV_ENV: (Process.env.ENV as Environments) === Environments.DEV,
  IS_LOCAL_ENV: (Process.env.ENV as Environments) === Environments.LOCAL,
};

export const FrontEndLink = {
  FRONT_END_LINK: Process.env.FRONT_END_LINK as string,
};

export const Jwt = {
  JWT_SECRET: Process.env.jwtSecret as string,
};

export const Hash = {
  SALT: (Process.env.salt as string) || '10',
};
export const LoggerLevel = {
  LOG_LEVEL: Process.env.LOG_LEVEL || 'debug',
};

export const Database = {
  DB_USER: Process.env.DB_USER as string,
  DB_NAME: Process.env.DB_NAME as string,
  DB_PASSWORD: Process.env.DB_PASSWORD as string,
  DB_HOST: Process.env.DB_HOST as string,
  MIGRATOR_DB_HOST: Process.env.MIGRATOR_DB_HOST as string,
};

export const Swagger = {
  PATH: Process.env.SWAGGER_PATH || '/api-docs',
};

export const AWS = {
  REGION: Process.env.AWS_REGION as string,
  ACCESS_KEY_ID: Process.env.AWS_ACCESS_KEY_ID as string,
  SECRET_ACCESS_KEY: Process.env.AWS_SECRET_ACCESS_KEY as string,
  BUCKET_NAME: Process.env.AWS_S3_BUCKET_NAME as string,
  CLOUDFRONT_DOMAIN: Process.env.AWS_CLOUD_FRONT_DOMAIN as string,
};

export const SMTP = {
  HOST: process.env.SMTP_HOST as string,
  PORT: parseInt(process.env.SMTP_PORT as string) || 587,
  USER: process.env.SMTP_USER as string,
  PASSWORD: process.env.SMTP_PASSWORD as string,
  FROM_EMAIL: process.env.SMTP_FROM_EMAIL as string,
  FROM_NAME: process.env.SMTP_FROM_NAME || 'TRU-FANS',
  SECURE: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465', // true for 465, false for 587
  BREVO_KEY: process.env.BREVO_KEY as string,
  BREVO_URL: process.env.BREVO_URL as string,
};

export const Stripe = {
  SECRET_KEY: process.env.STRIPE_SECRET_KEY as string,
  PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY as string,
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET as string,
};

export const ENV = {
  Server,
  Jwt,
  LoggerLevel,
  Database,
  Swagger,
  AWS,
  FrontEndLink,
  Stripe,
};
