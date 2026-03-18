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

const mockExtractedData = {
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
  education: [
    {
      degree: 'Master of Science in Computer Science',
      institution: 'University of Calgary',
      graduationDate: null,
      gpa: null,
      relevantCoursework: [],
      honors: [],
      thesisProject: 'Network simulator built with Java/Spring',
    },
  ],
  certifications: [
    {
      name: 'Node.js Advanced Concepts',
      issuingOrganization: null,
      dateObtained: null,
      expirationDate: null,
      credentialId: null,
    },
  ],
  projects: [
    {
      name: 'Search Microservice Sync Validator',
      description: 'Real-time validation between Elasticsearch and PostgreSQL',
      technologiesUsed: ['Elasticsearch', 'PostgreSQL', 'Node.js'],
      duration: null,
      role: 'Technical Lead',
      outcomes: ['Eliminated expensive daily full syncs'],
      repositoryUrl: null,
    },
  ],
  skills: {
    language: ['TypeScript', 'JavaScript'],
    framework: ['React', 'NestJS'],
  },
  professionalDevelopment: {
    book: ['Drive: The Surprising Truth About What Motivates Us'],
    course: ['Node.js Advanced Concepts'],
  },
};

const mockCareerProfile: CareerProfile = {
  id: 'profile-uuid',
  userId: 'user-uuid',
  extractionStatus: 'completed',
  lastExtractedAt: new Date('2026-03-15'),
  sourceDocumentId: 'doc-uuid',
  ...mockExtractedData,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockCareerProfileRepo: jest.Mocked<ICareerProfileRepository> = {
  findByUserId: jest.fn(),
  upsert: jest.fn(),
  updateSections: jest.fn(),
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
      'test-api-key',
      {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      } as never
    );
    mockAnthropicCreate = Anthropic.mock.instances[0].messages.create;
  });

  it('throws NotFoundException when user has no source document', async () => {
    mockSourceDocRepo.findByUserId.mockResolvedValue(null);
    await expect(
      service.extractFromSourceDocument('user-uuid')
    ).rejects.toThrow(NotFoundException);
  });

  it('reads PDF, calls Claude, parses all sections, upserts and returns CareerProfile', async () => {
    mockSourceDocRepo.findByUserId.mockResolvedValue(mockSourceDoc);
    mockStorage.read.mockResolvedValue(Buffer.from('pdf content'));
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockExtractedData) }],
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
        experiences: mockExtractedData.experiences,
        education: mockExtractedData.education,
        certifications: mockExtractedData.certifications,
        projects: mockExtractedData.projects,
        skills: mockExtractedData.skills,
        professionalDevelopment: mockExtractedData.professionalDevelopment,
      })
    );
    expect(result.id).toBe('profile-uuid');
  });

  it('upserts with empty collections when Claude returns invalid JSON', async () => {
    mockSourceDocRepo.findByUserId.mockResolvedValue(mockSourceDoc);
    mockStorage.read.mockResolvedValue(Buffer.from('pdf'));
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not valid json' }],
    });
    mockCareerProfileRepo.upsert.mockResolvedValue({
      ...mockCareerProfile,
      experiences: [],
      education: [],
      certifications: [],
      projects: [],
      skills: {},
      professionalDevelopment: {},
    });

    await service.extractFromSourceDocument('user-uuid');

    expect(mockCareerProfileRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        experiences: [],
        education: [],
        certifications: [],
        projects: [],
        skills: {},
        professionalDevelopment: {},
      })
    );
  });

  it('strips markdown code fences from Claude response before parsing', async () => {
    mockSourceDocRepo.findByUserId.mockResolvedValue(mockSourceDoc);
    mockStorage.read.mockResolvedValue(Buffer.from('pdf'));
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '```json\n' + JSON.stringify(mockExtractedData) + '\n```',
        },
      ],
    });
    mockCareerProfileRepo.upsert.mockResolvedValue(mockCareerProfile);

    await service.extractFromSourceDocument('user-uuid');

    expect(mockCareerProfileRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        experiences: mockExtractedData.experiences,
        education: mockExtractedData.education,
      })
    );
  });

  describe('updateSections', () => {
    const sectionsData = {
      experiences: mockExtractedData.experiences,
      education: mockExtractedData.education,
      certifications: mockExtractedData.certifications,
      projects: mockExtractedData.projects,
      skills: { backend: ['NestJS'] },
      professionalDevelopment: mockExtractedData.professionalDevelopment,
    };

    it('throws NotFoundException when profile does not exist', async () => {
      mockCareerProfileRepo.findByUserId.mockResolvedValue(null);

      await expect(
        service.updateSections('user-uuid', sectionsData)
      ).rejects.toThrow(NotFoundException);

      expect(mockCareerProfileRepo.updateSections).not.toHaveBeenCalled();
    });

    it('calls updateSections on repository and returns updated profile', async () => {
      mockCareerProfileRepo.findByUserId.mockResolvedValue(mockCareerProfile);
      mockCareerProfileRepo.updateSections.mockResolvedValue({
        ...mockCareerProfile,
        skills: { backend: ['NestJS'] },
      });

      const result = await service.updateSections('user-uuid', sectionsData);

      expect(mockCareerProfileRepo.updateSections).toHaveBeenCalledWith({
        userId: 'user-uuid',
        ...sectionsData,
      });
      expect(result.skills).toEqual({ backend: ['NestJS'] });
    });
  });

  describe('getByUserId', () => {
    it('returns the career profile when found', async () => {
      mockCareerProfileRepo.findByUserId.mockResolvedValue(mockCareerProfile);

      const result = await service.getByUserId('user-uuid');

      expect(mockCareerProfileRepo.findByUserId).toHaveBeenCalledWith(
        'user-uuid'
      );
      expect(result.id).toBe('profile-uuid');
    });

    it('throws NotFoundException when profile does not exist', async () => {
      mockCareerProfileRepo.findByUserId.mockResolvedValue(null);

      await expect(service.getByUserId('user-uuid')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
