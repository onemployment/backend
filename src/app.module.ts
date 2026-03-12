import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { SharedModule } from './shared/shared.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './routes/auth/auth.module';
import { UserModule } from './routes/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TerminusModule,
    DatabaseModule,
    SharedModule,
    HealthModule,
    AuthModule,
    UserModule,
  ],
})
export class AppModule {}
