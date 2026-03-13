import { Resume } from './resume.entity';

export const RESUME_REPOSITORY = Symbol('IResumeRepository');

export interface ResumeUpsertData {
  userId: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}

export interface IResumeRepository {
  findByUserId(userId: string): Promise<Resume | null>;
  upsert(data: ResumeUpsertData): Promise<Resume>;
  deleteByUserId(userId: string): Promise<void>;
}
