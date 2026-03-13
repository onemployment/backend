import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BcryptStrategy } from './strategies/bcrypt.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AppConfigService } from '../../shared/config/app-config.service';
import { PrismaPersistenceModule } from '../../infrastructure/persistence/prisma/prisma-persistence.module';

@Module({
  imports: [
    PrismaPersistenceModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret || 'development-secret-key',
        signOptions: {
          expiresIn: '8h',
          issuer: 'onemployment-auth',
          audience: 'onemployment-api',
        },
      }),
      inject: [AppConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: BcryptStrategy,
      useFactory: (config: AppConfigService) =>
        new BcryptStrategy(config.saltRounds),
      inject: [AppConfigService],
    },
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [JwtAuthGuard, JwtModule, BcryptStrategy],
})
export class AuthModule {}
