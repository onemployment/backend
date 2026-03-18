export interface ProfessionalIdentity {
  narrative: string;
}

export interface CoreValue {
  label: string;
  context: string | null;
}

export interface PersonalProfile {
  id: string;
  userId: string;
  professionalIdentity: ProfessionalIdentity;
  coreValues: CoreValue[];
  createdAt: Date;
  updatedAt: Date;
}
