import { Application, ApplicationStatus } from './application.entity';

export interface CreateApplicationData {
  userId: string;
  company: string;
  roleTitle: string;
  jobPostingText: string;
  analysis: Application['analysis'];
}

export interface ApplicationRepositoryPort {
  findAllByUserId(userId: string): Promise<Application[]>;
  findByIdAndUserId(id: string, userId: string): Promise<Application | null>;
  create(data: CreateApplicationData): Promise<Application>;
  updateStatus(
    id: string,
    userId: string,
    status: ApplicationStatus,
    appliedAt?: Date
  ): Promise<Application>;
}

export const APPLICATION_REPOSITORY = Symbol('APPLICATION_REPOSITORY');
