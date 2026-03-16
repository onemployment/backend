import { Module } from '@nestjs/common';
import { SourceDocumentController } from './source-document.controller';
import { SourceDocumentService } from './source-document.service';
import { PrismaSourceDocumentRepository } from '../../infrastructure/persistence/prisma/source-document.repository';
import { LocalFileStorageStrategy } from '../../infrastructure/storage/local-file-storage.strategy';
import { PrismaModule } from '../../infrastructure/persistence/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../../shared/shared.module';
import { SOURCE_DOCUMENT_REPOSITORY } from '../../domain/source-document/source-document.repository.port';
import { FILE_STORAGE } from '../../domain/source-document/file-storage.port';

@Module({
  imports: [PrismaModule, AuthModule, SharedModule],
  controllers: [SourceDocumentController],
  providers: [
    SourceDocumentService,
    {
      provide: SOURCE_DOCUMENT_REPOSITORY,
      useClass: PrismaSourceDocumentRepository,
    },
    {
      provide: FILE_STORAGE,
      useFactory: () => new LocalFileStorageStrategy('./uploads/resumes'),
    },
  ],
  exports: [SourceDocumentService, FILE_STORAGE, SOURCE_DOCUMENT_REPOSITORY],
})
export class SourceDocumentModule {}
