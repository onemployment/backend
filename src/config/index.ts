import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  environment: process.env.NODE_ENV || 'development',
  saltRounds: parseInt(process.env.SALT_ROUNDS || '12', 10),
  logLevel:
    process.env.NODE_ENV === 'production'
      ? 'warn'
      : process.env.NODE_ENV === 'test'
        ? 'silent'
        : 'debug',
} as const;
