import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { SourceDocumentModule } from './modules/source-document/source-document.module';
import { CareerProfileModule } from './modules/career-profile/career-profile.module';
import { PersonalProfileModule } from './modules/personal-profile/personal-profile.module';
import { ApplicationModule } from './modules/application/application.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SharedModule,
    AuthModule,
    UserModule,
    SourceDocumentModule,
    CareerProfileModule,
    PersonalProfileModule,
    ApplicationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
