import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.client';
import {
  ISourceDocumentRepository,
  SourceDocumentUpsertData,
} from '../../../domain/source-document/source-document.repository.port';
import { SourceDocument } from '../../../domain/source-document/source-document.entity';
import { SourceDocumentMapper } from './mappers/source-document.mapper';

@Injectable()
export class PrismaSourceDocumentRepository
  implements ISourceDocumentRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<SourceDocument | null> {
    const doc = await this.prisma.sourceDocument.findUnique({
      where: { userId },
    });
    return doc ? SourceDocumentMapper.toDomain(doc) : null;
  }

  async upsert(data: SourceDocumentUpsertData): Promise<SourceDocument> {
    const doc = await this.prisma.sourceDocument.upsert({
      where: { userId: data.userId },
      update: {
        originalFilename: data.originalFilename,
        storagePath: data.storagePath,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
      },
      create: {
        userId: data.userId,
        originalFilename: data.originalFilename,
        storagePath: data.storagePath,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
      },
    });
    return SourceDocumentMapper.toDomain(doc);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.sourceDocument.delete({ where: { userId } });
  }
}
