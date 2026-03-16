import { CareerProfile as PrismaCareerProfile } from '@prisma/client';
import {
  CareerProfile,
  ProfessionalExperience,
} from '../../../../domain/career-profile/career-profile.entity';

export class CareerProfileMapper {
  static toDomain(prismaProfile: PrismaCareerProfile): CareerProfile {
    return {
      id: prismaProfile.id,
      userId: prismaProfile.userId,
      extractionStatus:
        prismaProfile.extractionStatus as CareerProfile['extractionStatus'],
      lastExtractedAt: prismaProfile.lastExtractedAt,
      sourceDocumentId: prismaProfile.sourceDocumentId,
      experiences:
        prismaProfile.experiences as unknown as ProfessionalExperience[],
      createdAt: prismaProfile.createdAt,
      updatedAt: prismaProfile.updatedAt,
    };
  }
}
