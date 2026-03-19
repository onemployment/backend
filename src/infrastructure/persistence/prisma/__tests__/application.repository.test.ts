import { PrismaApplicationRepository } from '../application.repository';
import { PrismaService } from '../prisma.client';

const mockPrisma = {
  application: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const samplePrismaApp = {
  id: 'app-id',
  userId: 'user-id',
  company: 'Acme',
  roleTitle: 'Engineer',
  jobPostingText: 'Job text',
  status: 'ready',
  analysis: {
    overallSignal: 'strong',
    narrative: 'Great fit',
    categories: [],
  },
  appliedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PrismaApplicationRepository', () => {
  let repo: PrismaApplicationRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PrismaApplicationRepository(
      mockPrisma as unknown as PrismaService
    );
  });

  describe('findAllByUserId', () => {
    it('returns mapped applications sorted by createdAt desc', async () => {
      mockPrisma.application.findMany.mockResolvedValue([samplePrismaApp]);

      const result = await repo.findAllByUserId('user-id');

      expect(mockPrisma.application.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('app-id');
    });
  });

  describe('findByIdAndUserId', () => {
    it('returns mapped application when found', async () => {
      mockPrisma.application.findFirst.mockResolvedValue(samplePrismaApp);

      const result = await repo.findByIdAndUserId('app-id', 'user-id');

      expect(mockPrisma.application.findFirst).toHaveBeenCalledWith({
        where: { id: 'app-id', userId: 'user-id' },
      });
      expect(result?.id).toBe('app-id');
    });

    it('returns null when not found', async () => {
      mockPrisma.application.findFirst.mockResolvedValue(null);
      const result = await repo.findByIdAndUserId('missing', 'user-id');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates and returns a mapped application', async () => {
      mockPrisma.application.create.mockResolvedValue(samplePrismaApp);

      const result = await repo.create({
        userId: 'user-id',
        company: 'Acme',
        roleTitle: 'Engineer',
        jobPostingText: 'Job text',
        analysis: {
          overallSignal: 'strong',
          narrative: 'Great',
          categories: [],
        },
      });

      expect(mockPrisma.application.create).toHaveBeenCalled();
      expect(result.id).toBe('app-id');
    });
  });

  describe('updateStatus', () => {
    it('updates status and returns mapped application', async () => {
      const updated = {
        ...samplePrismaApp,
        status: 'applied',
        appliedAt: new Date(),
      };
      mockPrisma.application.update.mockResolvedValue(updated);

      const appliedAt = new Date();
      const result = await repo.updateStatus(
        'app-id',
        'user-id',
        'applied',
        appliedAt
      );

      expect(mockPrisma.application.update).toHaveBeenCalledWith({
        where: { id: 'app-id', userId: 'user-id' },
        data: { status: 'applied', appliedAt },
      });
      expect(result.status).toBe('applied');
    });

    it('updates status without appliedAt when not provided', async () => {
      mockPrisma.application.update.mockResolvedValue(samplePrismaApp);

      await repo.updateStatus('app-id', 'user-id', 'ready');

      expect(mockPrisma.application.update).toHaveBeenCalledWith({
        where: { id: 'app-id', userId: 'user-id' },
        data: { status: 'ready', appliedAt: undefined },
      });
    });
  });
});
