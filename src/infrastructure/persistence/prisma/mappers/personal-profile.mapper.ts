import { PersonalProfile as PrismaPersonalProfile } from '@prisma/client';
import {
  PersonalProfile,
  ProfessionalIdentity,
  CoreValue,
} from '../../../../domain/personal-profile/personal-profile.entity';

export class PersonalProfileMapper {
  static toDomain(prismaProfile: PrismaPersonalProfile): PersonalProfile {
    return {
      id: prismaProfile.id,
      userId: prismaProfile.userId,
      professionalIdentity:
        prismaProfile.professionalIdentity as unknown as ProfessionalIdentity,
      coreValues: prismaProfile.coreValues as unknown as CoreValue[],
      createdAt: prismaProfile.createdAt,
      updatedAt: prismaProfile.updatedAt,
    };
  }
}
