import { PrismaResumeRepository } from '../resume.repository';
import { ResumeUpsertData } from '../../../../domain/resume/resume.repository.port';

const mockPrismaResume = {
  id: 'resume-uuid',
  userId: 'user-uuid',
  originalFilename: 'cv.pdf',
  storagePath: 'uploads/resumes/user-uuid.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 50000,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockPrismaService = {
  resume: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
};

describe('PrismaResumeRepository', () => {
  let repo: PrismaResumeRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PrismaResumeRepository(mockPrismaService as never);
  });

  describe('findByUserId', () => {
    it('returns null when no resume found', async () => {
      mockPrismaService.resume.findUnique.mockResolvedValue(null);
      const result = await repo.findByUserId('user-uuid');
      expect(result).toBeNull();
    });

    it('returns mapped domain entity when resume found', async () => {
      mockPrismaService.resume.findUnique.mockResolvedValue(mockPrismaResume);
      const result = await repo.findByUserId('user-uuid');
      expect(result?.id).toBe('resume-uuid');
      expect(result?.userId).toBe('user-uuid');
    });
  });

  describe('upsert', () => {
    const data: ResumeUpsertData = {
      userId: 'user-uuid',
      originalFilename: 'cv.pdf',
      storagePath: 'uploads/resumes/user-uuid.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 50000,
    };

    it('calls prisma upsert and returns domain entity', async () => {
      mockPrismaService.resume.upsert.mockResolvedValue(mockPrismaResume);
      const result = await repo.upsert(data);
      expect(mockPrismaService.resume.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-uuid' } })
      );
      expect(result.userId).toBe('user-uuid');
    });
  });

  describe('deleteByUserId', () => {
    it('calls prisma delete with userId', async () => {
      mockPrismaService.resume.delete.mockResolvedValue(mockPrismaResume);
      await repo.deleteByUserId('user-uuid');
      expect(mockPrismaService.resume.delete).toHaveBeenCalledWith({
        where: { userId: 'user-uuid' },
      });
    });
  });
});
