import {
  CareerProfile,
  ProfessionalExperience,
  Education,
  Certification,
  Project,
  Skills,
  ProfessionalDevelopment,
} from './career-profile.entity';

export const CAREER_PROFILE_REPOSITORY = Symbol('ICareerProfileRepository');

export interface CareerProfileUpsertData {
  userId: string;
  extractionStatus: CareerProfile['extractionStatus'];
  lastExtractedAt: Date | null;
  sourceDocumentId: string | null;
  experiences: ProfessionalExperience[];
  education: Education[];
  certifications: Certification[];
  projects: Project[];
  skills: Skills;
  professionalDevelopment: ProfessionalDevelopment;
}

export interface ICareerProfileRepository {
  findByUserId(userId: string): Promise<CareerProfile | null>;
  upsert(data: CareerProfileUpsertData): Promise<CareerProfile>;
}
