import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get host(): string {
    return this.configService.get<string>('HOST', '0.0.0.0');
  }

  get environment(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get redisUrl(): string {
    return this.configService.get<string>('REDIS_URL') || '';
  }

  get databaseUrl(): string {
    return this.configService.get<string>('POSTGRES_DB_URL') || '';
  }

  get saltRounds(): number {
    return this.configService.get<number>('SALT_ROUNDS', 12);
  }

  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') || '';
  }
}
