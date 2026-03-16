import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  ISourceDocumentRepository,
  SOURCE_DOCUMENT_REPOSITORY,
} from '../../domain/source-document/source-document.repository.port';
import {
  IFileStorage,
  FILE_STORAGE,
} from '../../domain/source-document/file-storage.port';
import { SourceDocument } from '../../domain/source-document/source-document.entity';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = 'application/pdf';

@Injectable()
export class SourceDocumentService {
  constructor(
    @Inject(SOURCE_DOCUMENT_REPOSITORY)
    private readonly sourceDocumentRepository: ISourceDocumentRepository,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: IFileStorage
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
    return this.sourceDocumentRepository.upsert({
      userId,
      originalFilename,
      storagePath,
      mimeType,
      sizeBytes,
    });
  }

  async findByUserId(userId: string): Promise<SourceDocument | null> {
    return this.sourceDocumentRepository.findByUserId(userId);
  }
}
