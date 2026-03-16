import { Module } from '@nestjs/common';
import { CareerProfileController } from './career-profile.controller';
import { CareerProfileService } from './career-profile.service';
import { PrismaCareerProfileRepository } from '../../infrastructure/persistence/prisma/career-profile.repository';
import { PrismaModule } from '../../infrastructure/persistence/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../../shared/shared.module';
import { SourceDocumentModule } from '../source-document/source-document.module';
import { CAREER_PROFILE_REPOSITORY } from '../../domain/career-profile/career-profile.repository.port';
import { AppConfigService } from '../../shared/config/app-config.service';

@Module({
  imports: [PrismaModule, AuthModule, SharedModule, SourceDocumentModule],
  controllers: [CareerProfileController],
  providers: [
    CareerProfileService,
    {
      provide: CAREER_PROFILE_REPOSITORY,
      useClass: PrismaCareerProfileRepository,
    },
    {
      provide: 'ANTHROPIC_API_KEY',
      useFactory: (config: AppConfigService) => config.anthropicApiKey,
      inject: [AppConfigService],
    },
  ],
})
export class CareerProfileModule {}
