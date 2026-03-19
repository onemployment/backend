import { Application as PrismaApplication } from '@prisma/client';
import {
  Application,
  ApplicationAnalysis,
} from '../../../../domain/application/application.entity';

function isValidAnalysis(value: unknown): value is ApplicationAnalysis {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['overallSignal'] === 'string' &&
    typeof obj['narrative'] === 'string' &&
    Array.isArray(obj['categories'])
  );
}

export class ApplicationMapper {
  static toDomain(raw: PrismaApplication): Application {
    return {
      id: raw.id,
      userId: raw.userId,
      company: raw.company,
      roleTitle: raw.roleTitle,
      jobPostingText: raw.jobPostingText,
      status: raw.status as Application['status'],
      analysis: isValidAnalysis(raw.analysis) ? raw.analysis : null,
      appliedAt: raw.appliedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
