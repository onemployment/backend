import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.client';
import {
  ICareerProfileRepository,
  CareerProfileUpsertData,
  CareerProfileSectionsData,
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
    const fields = {
      extractionStatus: data.extractionStatus,
      lastExtractedAt: data.lastExtractedAt,
      sourceDocumentId: data.sourceDocumentId,
      experiences: data.experiences as unknown as Prisma.InputJsonValue,
      education: data.education as unknown as Prisma.InputJsonValue,
      certifications: data.certifications as unknown as Prisma.InputJsonValue,
      projects: data.projects as unknown as Prisma.InputJsonValue,
      skills: data.skills as unknown as Prisma.InputJsonValue,
      professionalDevelopment:
        data.professionalDevelopment as unknown as Prisma.InputJsonValue,
    };

    const profile = await this.prisma.careerProfile.upsert({
      where: { userId: data.userId },
      update: fields,
      create: { userId: data.userId, ...fields },
    });
    return CareerProfileMapper.toDomain(profile);
  }

  async updateSections(
    data: CareerProfileSectionsData
  ): Promise<CareerProfile> {
    const profile = await this.prisma.careerProfile.update({
      where: { userId: data.userId },
      data: {
        experiences: data.experiences as unknown as Prisma.InputJsonValue,
        education: data.education as unknown as Prisma.InputJsonValue,
        certifications: data.certifications as unknown as Prisma.InputJsonValue,
        projects: data.projects as unknown as Prisma.InputJsonValue,
        skills: data.skills as unknown as Prisma.InputJsonValue,
        professionalDevelopment:
          data.professionalDevelopment as unknown as Prisma.InputJsonValue,
      },
    });
    return CareerProfileMapper.toDomain(profile);
  }
}
