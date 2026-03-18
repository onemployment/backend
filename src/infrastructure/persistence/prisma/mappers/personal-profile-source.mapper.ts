import { PersonalProfileSource as PrismaPersonalProfileSource } from '@prisma/client';
import { PersonalProfileSource } from '../../../../domain/personal-profile/personal-profile-source.entity';

export class PersonalProfileSourceMapper {
  static toDomain(
    prismaSource: PrismaPersonalProfileSource
  ): PersonalProfileSource {
    return {
      id: prismaSource.id,
      userId: prismaSource.userId,
      text: prismaSource.text,
      createdAt: prismaSource.createdAt,
      updatedAt: prismaSource.updatedAt,
    };
  }
}
