import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.client';
import {
  ApplicationRepositoryPort,
  CreateApplicationData,
} from '../../../domain/application/application.repository.port';
import {
  Application,
  ApplicationStatus,
} from '../../../domain/application/application.entity';
import { ApplicationMapper } from './mappers/application.mapper';

@Injectable()
export class PrismaApplicationRepository implements ApplicationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUserId(userId: string): Promise<Application[]> {
    const records = await this.prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(ApplicationMapper.toDomain);
  }

  async findByIdAndUserId(
    id: string,
    userId: string
  ): Promise<Application | null> {
    const record = await this.prisma.application.findFirst({
      where: { id, userId },
    });
    return record ? ApplicationMapper.toDomain(record) : null;
  }

  async create(data: CreateApplicationData): Promise<Application> {
    const record = await this.prisma.application.create({
      data: {
        userId: data.userId,
        company: data.company,
        roleTitle: data.roleTitle,
        jobPostingText: data.jobPostingText,
      },
    });
    return ApplicationMapper.toDomain(record);
  }

  async updateAnalysis(
    id: string,
    userId: string,
    analysis: Application['analysis']
  ): Promise<Application> {
    const record = await this.prisma.application.update({
      where: { id, userId },
      data: {
        analysis: analysis as unknown as Prisma.InputJsonValue,
        status: 'ready',
      },
    });
    return ApplicationMapper.toDomain(record);
  }

  async updateStatus(
    id: string,
    userId: string,
    status: ApplicationStatus,
    appliedAt?: Date
  ): Promise<Application> {
    const record = await this.prisma.application.update({
      where: { id, userId },
      data: { status, appliedAt },
    });
    return ApplicationMapper.toDomain(record);
  }
}
