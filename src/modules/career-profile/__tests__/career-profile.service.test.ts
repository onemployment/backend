import { NotFoundException } from '@nestjs/common';
import { CareerProfileService } from '../career-profile.service';
import { ICareerProfileRepository } from '../../../domain/career-profile/career-profile.repository.port';
import { ISourceDocumentRepository } from '../../../domain/source-document/source-document.repository.port';
import { IFileStorage } from '../../../domain/source-document/file-storage.port';
import { CareerProfile } from '../../../domain/career-profile/career-profile.entity';
import { SourceDocument } from '../../../domain/source-document/source-document.entity';

const mockSourceDoc: SourceDocument = {
  id: 'doc-uuid',
  userId: 'user-uuid',
  originalFilename: 'cv.pdf',
  storagePath: 'uploads/resumes/user-uuid.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockCareerProfile: CareerProfile = {
  id: 'profile-uuid',
  userId: 'user-uuid',
  extractionStatus: 'completed',
  lastExtractedAt: new Date('2026-03-15'),
  sourceDocumentId: 'doc-uuid',
  experiences: [
    {
      jobTitle: 'Software Engineer',
      company: 'Acme',
      location: null,
      startDate: 'Jan 2022',
      endDate: null,
      employmentType: 'Full-time',
      starExperiences: [],
    },
  ],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockCareerProfileRepo: jest.Mocked<ICareerProfileRepository> = {
  findByUserId: jest.fn(),
  upsert: jest.fn(),
};

const mockSourceDocRepo: jest.Mocked<ISourceDocumentRepository> = {
  findByUserId: jest.fn(),
  upsert: jest.fn(),
  deleteByUserId: jest.fn(),
};

const mockStorage: jest.Mocked<IFileStorage> = {
  save: jest.fn(),
  read: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(function (
    this: Record<string, unknown>
  ) {
    this.messages = { create: jest.fn() };
  }),
}));

describe('CareerProfileService', () => {
  let service: CareerProfileService;
  let mockAnthropicCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const Anthropic = require('@anthropic-ai/sdk').default;
    Anthropic.mockClear();
    service = new CareerProfileService(
      mockCareerProfileRepo,
      mockSourceDocRepo,
      mockStorage,
      'test-api-key'
    );
    mockAnthropicCreate = Anthropic.mock.instances[0].messages.create;
  });

  it('throws NotFoundException when user has no source document', async () => {
    mockSourceDocRepo.findByUserId.mockResolvedValue(null);
    await expect(
      service.extractFromSourceDocument('user-uuid')
    ).rejects.toThrow(NotFoundException);
  });

  it('reads PDF, calls Claude, parses JSON, upserts and returns CareerProfile', async () => {
    mockSourceDocRepo.findByUserId.mockResolvedValue(mockSourceDoc);
    mockStorage.read.mockResolvedValue(Buffer.from('pdf content'));
    mockAnthropicCreate.mockResolvedValue({
      content: [
        { type: 'text', text: JSON.stringify(mockCareerProfile.experiences) },
      ],
    });
    mockCareerProfileRepo.upsert.mockResolvedValue(mockCareerProfile);

    const result = await service.extractFromSourceDocument('user-uuid');

    expect(mockStorage.read).toHaveBeenCalledWith(mockSourceDoc.storagePath);
    expect(mockAnthropicCreate).toHaveBeenCalledTimes(1);
    expect(mockCareerProfileRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid',
        extractionStatus: 'completed',
        sourceDocumentId: 'doc-uuid',
      })
    );
    expect(result.id).toBe('profile-uuid');
    expect(result.experiences).toHaveLength(1);
  });

  it('upserts with empty experiences array when Claude returns invalid JSON', async () => {
    mockSourceDocRepo.findByUserId.mockResolvedValue(mockSourceDoc);
    mockStorage.read.mockResolvedValue(Buffer.from('pdf'));
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not valid json' }],
    });
    mockCareerProfileRepo.upsert.mockResolvedValue({
      ...mockCareerProfile,
      experiences: [],
    });

    await service.extractFromSourceDocument('user-uuid');

    expect(mockCareerProfileRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ experiences: [] })
    );
  });
});
