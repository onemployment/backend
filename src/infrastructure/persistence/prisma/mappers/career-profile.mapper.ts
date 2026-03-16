import { CareerProfile as PrismaCareerProfile } from '@prisma/client';
import {
  CareerProfile,
  ProfessionalExperience,
  Education,
  Certification,
  Project,
  Skills,
  ProfessionalDevelopment,
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
      education: prismaProfile.education as unknown as Education[],
      certifications:
        prismaProfile.certifications as unknown as Certification[],
      projects: prismaProfile.projects as unknown as Project[],
      skills: prismaProfile.skills as unknown as Skills,
      professionalDevelopment:
        prismaProfile.professionalDevelopment as unknown as ProfessionalDevelopment,
      createdAt: prismaProfile.createdAt,
      updatedAt: prismaProfile.updatedAt,
    };
  }
}
