import { CareerProfile, ProfessionalExperience } from './career-profile.entity';

export const CAREER_PROFILE_REPOSITORY = Symbol('ICareerProfileRepository');

export interface CareerProfileUpsertData {
  userId: string;
  extractionStatus: CareerProfile['extractionStatus'];
  lastExtractedAt: Date | null;
  sourceDocumentId: string | null;
  experiences: ProfessionalExperience[];
}

export interface ICareerProfileRepository {
  findByUserId(userId: string): Promise<CareerProfile | null>;
  upsert(data: CareerProfileUpsertData): Promise<CareerProfile>;
}
