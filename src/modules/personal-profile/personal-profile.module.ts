import { Module } from '@nestjs/common';
import { PersonalProfileController } from './personal-profile.controller';
import { PersonalProfileService } from './personal-profile.service';
import { PrismaPersonalProfileRepository } from '../../infrastructure/persistence/prisma/personal-profile.repository';
import { PrismaPersonalProfileSourceRepository } from '../../infrastructure/persistence/prisma/personal-profile-source.repository';
import { PrismaModule } from '../../infrastructure/persistence/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../../shared/shared.module';
import { PERSONAL_PROFILE_REPOSITORY } from '../../domain/personal-profile/personal-profile.repository.port';
import { PERSONAL_PROFILE_SOURCE_REPOSITORY } from '../../domain/personal-profile/personal-profile-source.repository.port';
import { AppConfigService } from '../../shared/config/app-config.service';

@Module({
  imports: [PrismaModule, AuthModule, SharedModule],
  controllers: [PersonalProfileController],
  providers: [
    PersonalProfileService,
    {
      provide: PERSONAL_PROFILE_REPOSITORY,
      useClass: PrismaPersonalProfileRepository,
    },
    {
      provide: PERSONAL_PROFILE_SOURCE_REPOSITORY,
      useClass: PrismaPersonalProfileSourceRepository,
    },
    {
      provide: 'ANTHROPIC_API_KEY',
      useFactory: (config: AppConfigService) => config.anthropicApiKey,
      inject: [AppConfigService],
    },
  ],
})
export class PersonalProfileModule {}
