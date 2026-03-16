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

export interface Education {
  degree: string;
  institution: string;
  graduationDate: string | null;
  gpa: string | null;
  relevantCoursework: string[];
  honors: string[];
  thesisProject: string | null;
}

export interface Certification {
  name: string;
  issuingOrganization: string | null;
  dateObtained: string | null;
  expirationDate: string | null;
  credentialId: string | null;
}

export interface Project {
  name: string;
  description: string;
  technologiesUsed: string[];
  duration: string | null;
  role: string | null;
  outcomes: string[];
  repositoryUrl: string | null;
}

// { "language": ["TypeScript", "Python"], "framework": ["React", "NestJS"], ... }
export type Skills = Record<string, string[]>;

// { "book": ["Drive: ...", "Accelerate: ..."], "course": ["Node.js Advanced Concepts"] }
export type ProfessionalDevelopment = Record<string, string[]>;

export interface CareerProfile {
  id: string;
  userId: string;
  extractionStatus: 'not_started' | 'extracting' | 'completed' | 'failed';
  lastExtractedAt: Date | null;
  sourceDocumentId: string | null;
  experiences: ProfessionalExperience[];
  education: Education[];
  certifications: Certification[];
  projects: Project[];
  skills: Skills;
  professionalDevelopment: ProfessionalDevelopment;
  createdAt: Date;
  updatedAt: Date;
}
