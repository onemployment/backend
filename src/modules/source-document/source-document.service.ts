import {
  Injectable,
  Inject,
  BadRequestException,
  LoggerService as ILoggerService,
} from '@nestjs/common';
import {
  ISourceDocumentRepository,
  SOURCE_DOCUMENT_REPOSITORY,
} from '../../domain/source-document/source-document.repository.port';
import {
  IFileStorage,
  FILE_STORAGE,
} from '../../domain/source-document/file-storage.port';
import { SourceDocument } from '../../domain/source-document/source-document.entity';
import { LOGGER } from '../../shared/logger/logger.port';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = 'application/pdf';

@Injectable()
export class SourceDocumentService {
  constructor(
    @Inject(SOURCE_DOCUMENT_REPOSITORY)
    private readonly sourceDocumentRepository: ISourceDocumentRepository,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: IFileStorage,
    @Inject(LOGGER)
    private readonly logger: ILoggerService
  ) {}

  async uploadSourceDocument(
    userId: string,
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    sizeBytes: number
  ): Promise<SourceDocument> {
    if (mimeType !== ALLOWED_MIME) {
      throw new BadRequestException('Only PDF files are allowed');
    }
    if (sizeBytes > MAX_FILE_SIZE) {
      throw new BadRequestException('File size must not exceed 10MB');
    }

    const storagePath = await this.fileStorage.save(buffer, `${userId}.pdf`);
    const doc = await this.sourceDocumentRepository.upsert({
      userId,
      originalFilename,
      storagePath,
      mimeType,
      sizeBytes,
    });

    this.logger.log(
      `Source document uploaded: userId=${userId} filename=${originalFilename} size=${sizeBytes}`,
      'SourceDocumentService'
    );

    return doc;
  }

  async findByUserId(userId: string): Promise<SourceDocument | null> {
    return this.sourceDocumentRepository.findByUserId(userId);
  }
}
