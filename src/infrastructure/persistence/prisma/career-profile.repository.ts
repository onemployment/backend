import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.client';
import {
  ICareerProfileRepository,
  CareerProfileUpsertData,
} from '../../../domain/career-profile/career-profile.repository.port';
import { CareerProfile } from '../../../domain/career-profile/career-profile.entity';
import { CareerProfileMapper } from './mappers/career-profile.mapper';

@Injectable()
export class PrismaCareerProfileRepository implements ICareerProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<CareerProfile | null> {
    const profile = await this.prisma.careerProfile.findUnique({
      where: { userId },
    });
    return profile ? CareerProfileMapper.toDomain(profile) : null;
  }

  async upsert(data: CareerProfileUpsertData): Promise<CareerProfile> {
    const profile = await this.prisma.careerProfile.upsert({
      where: { userId: data.userId },
      update: {
        extractionStatus: data.extractionStatus,
        lastExtractedAt: data.lastExtractedAt,
        sourceDocumentId: data.sourceDocumentId,
        experiences: data.experiences as unknown as Prisma.InputJsonValue,
      },
      create: {
        userId: data.userId,
        extractionStatus: data.extractionStatus,
        lastExtractedAt: data.lastExtractedAt,
        sourceDocumentId: data.sourceDocumentId,
        experiences: data.experiences as unknown as Prisma.InputJsonValue,
      },
    });
    return CareerProfileMapper.toDomain(profile);
  }
}
