import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.client';
import {
  IPersonalProfileRepository,
  PersonalProfileUpsertData,
} from '../../../domain/personal-profile/personal-profile.repository.port';
import { PersonalProfile } from '../../../domain/personal-profile/personal-profile.entity';
import { PersonalProfileMapper } from './mappers/personal-profile.mapper';

@Injectable()
export class PrismaPersonalProfileRepository
  implements IPersonalProfileRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<PersonalProfile | null> {
    const profile = await this.prisma.personalProfile.findUnique({
      where: { userId },
    });
    return profile ? PersonalProfileMapper.toDomain(profile) : null;
  }

  async upsert(data: PersonalProfileUpsertData): Promise<PersonalProfile> {
    const fields = {
      professionalIdentity:
        data.professionalIdentity as unknown as Prisma.InputJsonValue,
      coreValues: data.coreValues as unknown as Prisma.InputJsonValue,
    };
    const profile = await this.prisma.personalProfile.upsert({
      where: { userId: data.userId },
      update: fields,
      create: { userId: data.userId, ...fields },
    });
    return PersonalProfileMapper.toDomain(profile);
  }
}
