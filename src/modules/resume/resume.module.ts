import { Module } from '@nestjs/common';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { PrismaResumeRepository } from '../../infrastructure/persistence/prisma/resume.repository';
import { LocalFileStorageStrategy } from '../../infrastructure/storage/local-file-storage.strategy';
import { PrismaModule } from '../../infrastructure/persistence/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../../shared/shared.module';
import { RESUME_REPOSITORY } from '../../domain/resume/resume.repository.port';
import { FILE_STORAGE } from '../../domain/resume/file-storage.port';
import { AppConfigService } from '../../shared/config/app-config.service';

@Module({
  imports: [PrismaModule, AuthModule, SharedModule],
  controllers: [ResumeController],
  providers: [
    ResumeService,
    {
      provide: RESUME_REPOSITORY,
      useClass: PrismaResumeRepository,
    },
    {
      provide: FILE_STORAGE,
      useFactory: () => new LocalFileStorageStrategy('./uploads/resumes'),
    },
    {
      provide: 'ANTHROPIC_API_KEY',
      useFactory: (config: AppConfigService) => config.anthropicApiKey,
      inject: [AppConfigService],
    },
  ],
})
export class ResumeModule {}
