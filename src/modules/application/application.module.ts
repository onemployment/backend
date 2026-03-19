import { Module } from '@nestjs/common';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { PrismaModule } from '../../infrastructure/persistence/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../../shared/shared.module';
import { AppConfigService } from '../../shared/config/app-config.service';
import { PrismaApplicationRepository } from '../../infrastructure/persistence/prisma/application.repository';
import { APPLICATION_REPOSITORY } from '../../domain/application/application.repository.port';
import { CAREER_PROFILE_REPOSITORY } from '../../domain/career-profile/career-profile.repository.port';
import { PERSONAL_PROFILE_REPOSITORY } from '../../domain/personal-profile/personal-profile.repository.port';
import { PrismaCareerProfileRepository } from '../../infrastructure/persistence/prisma/career-profile.repository';
import { PrismaPersonalProfileRepository } from '../../infrastructure/persistence/prisma/personal-profile.repository';

@Module({
  imports: [PrismaModule, AuthModule, SharedModule],
  controllers: [ApplicationController],
  providers: [
    ApplicationService,
    {
      provide: APPLICATION_REPOSITORY,
      useClass: PrismaApplicationRepository,
    },
    {
      provide: CAREER_PROFILE_REPOSITORY,
      useClass: PrismaCareerProfileRepository,
    },
    {
      provide: PERSONAL_PROFILE_REPOSITORY,
      useClass: PrismaPersonalProfileRepository,
    },
    {
      provide: 'ANTHROPIC_API_KEY',
      useFactory: (config: AppConfigService) => config.anthropicApiKey,
      inject: [AppConfigService],
    },
  ],
})
export class ApplicationModule {}
