export interface StarExperience {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  quantifiedMetrics: string[];
  domainContext: string | null;
}

export interface ProfessionalExperience {
  jobTitle: string;
  company: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  employmentType: string | null;
  starExperiences: StarExperience[];
}

export interface CareerProfile {
  id: string;
  userId: string;
  extractionStatus: 'not_started' | 'extracting' | 'completed' | 'failed';
  lastExtractedAt: Date | null;
  sourceDocumentId: string | null;
  experiences: ProfessionalExperience[];
  createdAt: Date;
  updatedAt: Date;
}
