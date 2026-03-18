import {
  PersonalProfile,
  ProfessionalIdentity,
  CoreValue,
} from './personal-profile.entity';

export const PERSONAL_PROFILE_REPOSITORY = Symbol('IPersonalProfileRepository');

export interface PersonalProfileUpsertData {
  userId: string;
  professionalIdentity: ProfessionalIdentity;
  coreValues: CoreValue[];
}

export interface IPersonalProfileRepository {
  findByUserId(userId: string): Promise<PersonalProfile | null>;
  upsert(data: PersonalProfileUpsertData): Promise<PersonalProfile>;
}
