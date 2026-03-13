import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.client';
import {
  IResumeRepository,
  ResumeUpsertData,
} from '../../../domain/resume/resume.repository.port';
import { Resume } from '../../../domain/resume/resume.entity';
import { ResumeMapper } from './mappers/resume.mapper';

@Injectable()
export class PrismaResumeRepository implements IResumeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<Resume | null> {
    const resume = await this.prisma.resume.findUnique({ where: { userId } });
    return resume ? ResumeMapper.toDomain(resume) : null;
  }

  async upsert(data: ResumeUpsertData): Promise<Resume> {
    const resume = await this.prisma.resume.upsert({
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
    return ResumeMapper.toDomain(resume);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.resume.delete({ where: { userId } });
  }
}
