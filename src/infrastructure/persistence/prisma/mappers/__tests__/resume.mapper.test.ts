import { Resume as PrismaResume } from '@prisma/client';
import { ResumeMapper } from '../resume.mapper';

const prismaResume: PrismaResume = {
  id: 'resume-uuid',
  userId: 'user-uuid',
  originalFilename: 'my-cv.pdf',
  storagePath: 'uploads/resumes/user-uuid.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 102400,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('ResumeMapper', () => {
  it('maps all Prisma fields to domain entity', () => {
    const domain = ResumeMapper.toDomain(prismaResume);

    expect(domain.id).toBe('resume-uuid');
    expect(domain.userId).toBe('user-uuid');
    expect(domain.originalFilename).toBe('my-cv.pdf');
    expect(domain.storagePath).toBe('uploads/resumes/user-uuid.pdf');
    expect(domain.mimeType).toBe('application/pdf');
    expect(domain.sizeBytes).toBe(102400);
    expect(domain.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(domain.updatedAt).toEqual(new Date('2026-01-02T00:00:00.000Z'));
  });
});
