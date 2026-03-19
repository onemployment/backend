export type ApplicationStatus = 'draft' | 'ready' | 'applied';
export type FitSignal = 'strong' | 'moderate' | 'weak';
export type CategorySignal = 'strong' | 'partial' | 'gap';

export interface AnalysisCategory {
  name: string;
  signal: CategorySignal;
  observations: string[];
}

export interface ApplicationAnalysis {
  overallSignal: FitSignal;
  narrative: string;
  categories: AnalysisCategory[];
}

export interface Application {
  id: string;
  userId: string;
  company: string;
  roleTitle: string;
  jobPostingText: string;
  status: ApplicationStatus;
  analysis: ApplicationAnalysis | null;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
