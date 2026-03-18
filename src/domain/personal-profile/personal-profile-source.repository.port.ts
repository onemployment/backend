import { PersonalProfileSource } from './personal-profile-source.entity';

export const PERSONAL_PROFILE_SOURCE_REPOSITORY = Symbol(
  'IPersonalProfileSourceRepository'
);

export interface PersonalProfileSourceUpsertData {
  userId: string;
  text: string;
}

export interface IPersonalProfileSourceRepository {
  findByUserId(userId: string): Promise<PersonalProfileSource | null>;
  upsert(data: PersonalProfileSourceUpsertData): Promise<PersonalProfileSource>;
}
