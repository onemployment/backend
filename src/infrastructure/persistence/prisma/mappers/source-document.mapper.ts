import { SourceDocument as PrismaSourceDocument } from '@prisma/client';
import { SourceDocument } from '../../../../domain/source-document/source-document.entity';

export class SourceDocumentMapper {
  static toDomain(prismaDoc: PrismaSourceDocument): SourceDocument {
    return {
      id: prismaDoc.id,
      userId: prismaDoc.userId,
      originalFilename: prismaDoc.originalFilename,
      storagePath: prismaDoc.storagePath,
      mimeType: prismaDoc.mimeType,
      sizeBytes: prismaDoc.sizeBytes,
      createdAt: prismaDoc.createdAt,
      updatedAt: prismaDoc.updatedAt,
    };
  }
}
