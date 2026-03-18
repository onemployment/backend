import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.client';
import {
  IPersonalProfileSourceRepository,
  PersonalProfileSourceUpsertData,
} from '../../../domain/personal-profile/personal-profile-source.repository.port';
import { PersonalProfileSource } from '../../../domain/personal-profile/personal-profile-source.entity';
import { PersonalProfileSourceMapper } from './mappers/personal-profile-source.mapper';

@Injectable()
export class PrismaPersonalProfileSourceRepository
  implements IPersonalProfileSourceRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<PersonalProfileSource | null> {
    const source = await this.prisma.personalProfileSource.findUnique({
      where: { userId },
    });
    return source ? PersonalProfileSourceMapper.toDomain(source) : null;
  }

  async upsert(
    data: PersonalProfileSourceUpsertData
  ): Promise<PersonalProfileSource> {
    const source = await this.prisma.personalProfileSource.upsert({
      where: { userId: data.userId },
      update: { text: data.text },
      create: { userId: data.userId, text: data.text },
    });
    return PersonalProfileSourceMapper.toDomain(source);
  }
}
