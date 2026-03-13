import { Resume as PrismaResume } from '@prisma/client';
import { Resume } from '../../../../domain/resume/resume.entity';

export class ResumeMapper {
  static toDomain(prismaResume: PrismaResume): Resume {
    return {
      id: prismaResume.id,
      userId: prismaResume.userId,
      originalFilename: prismaResume.originalFilename,
      storagePath: prismaResume.storagePath,
      mimeType: prismaResume.mimeType,
      sizeBytes: prismaResume.sizeBytes,
      createdAt: prismaResume.createdAt,
      updatedAt: prismaResume.updatedAt,
    };
  }
}
