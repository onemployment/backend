import { PrismaCareerProfileRepository } from '../career-profile.repository';
import { CareerProfileUpsertData } from '../../../../domain/career-profile/career-profile.repository.port';

const mockPrismaProfile = {
  id: 'profile-uuid',
  userId: 'user-uuid',
  extractionStatus: 'completed',
  lastExtractedAt: new Date('2026-03-15'),
  sourceDocumentId: 'doc-uuid',
  experiences: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockPrismaService = {
  careerProfile: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('PrismaCareerProfileRepository', () => {
  let repo: PrismaCareerProfileRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PrismaCareerProfileRepository(mockPrismaService as never);
  });

  describe('findByUserId', () => {
    it('returns null when no profile found', async () => {
      mockPrismaService.careerProfile.findUnique.mockResolvedValue(null);
      const result = await repo.findByUserId('user-uuid');
      expect(result).toBeNull();
    });

    it('returns mapped domain entity when profile found', async () => {
      mockPrismaService.careerProfile.findUnique.mockResolvedValue(
        mockPrismaProfile
      );
      const result = await repo.findByUserId('user-uuid');
      expect(result?.id).toBe('profile-uuid');
      expect(result?.experiences).toEqual([]);
    });
  });

  describe('upsert', () => {
    const data: CareerProfileUpsertData = {
      userId: 'user-uuid',
      extractionStatus: 'completed',
      lastExtractedAt: new Date('2026-03-15'),
      sourceDocumentId: 'doc-uuid',
      experiences: [],
    };

    it('calls prisma upsert and returns domain entity', async () => {
      mockPrismaService.careerProfile.upsert.mockResolvedValue(
        mockPrismaProfile
      );
      const result = await repo.upsert(data);
      expect(mockPrismaService.careerProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-uuid' } })
      );
      expect(result.userId).toBe('user-uuid');
    });
  });
});
