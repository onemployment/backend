import { PrismaSourceDocumentRepository } from '../source-document.repository';
import { SourceDocumentUpsertData } from '../../../../domain/source-document/source-document.repository.port';

const mockPrismaDoc = {
  id: 'doc-uuid',
  userId: 'user-uuid',
  originalFilename: 'cv.pdf',
  storagePath: 'uploads/resumes/user-uuid.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 50000,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockPrismaService = {
  sourceDocument: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
};

describe('PrismaSourceDocumentRepository', () => {
  let repo: PrismaSourceDocumentRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PrismaSourceDocumentRepository(mockPrismaService as never);
  });

  describe('findByUserId', () => {
    it('returns null when no document found', async () => {
      mockPrismaService.sourceDocument.findUnique.mockResolvedValue(null);
      const result = await repo.findByUserId('user-uuid');
      expect(result).toBeNull();
    });

    it('returns mapped domain entity when document found', async () => {
      mockPrismaService.sourceDocument.findUnique.mockResolvedValue(
        mockPrismaDoc
      );
      const result = await repo.findByUserId('user-uuid');
      expect(result?.id).toBe('doc-uuid');
      expect(result?.userId).toBe('user-uuid');
    });
  });

  describe('upsert', () => {
    const data: SourceDocumentUpsertData = {
      userId: 'user-uuid',
      originalFilename: 'cv.pdf',
      storagePath: 'uploads/resumes/user-uuid.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 50000,
    };

    it('calls prisma upsert and returns domain entity', async () => {
      mockPrismaService.sourceDocument.upsert.mockResolvedValue(mockPrismaDoc);
      const result = await repo.upsert(data);
      expect(mockPrismaService.sourceDocument.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-uuid' } })
      );
      expect(result.userId).toBe('user-uuid');
    });
  });

  describe('deleteByUserId', () => {
    it('calls prisma delete with userId', async () => {
      mockPrismaService.sourceDocument.delete.mockResolvedValue(mockPrismaDoc);
      await repo.deleteByUserId('user-uuid');
      expect(mockPrismaService.sourceDocument.delete).toHaveBeenCalledWith({
        where: { userId: 'user-uuid' },
      });
    });
  });
});
