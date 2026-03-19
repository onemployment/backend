import { ApplicationService } from '../application.service';
import { NotFoundException } from '@nestjs/common';

const mockApplicationRepo = {
  findAllByUserId: jest.fn(),
  findByIdAndUserId: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
};

const mockCareerProfileRepo = {
  findByUserId: jest.fn(),
};

const mockPersonalProfileRepo = {
  findByUserId: jest.fn(),
};

const mockAnthropic = {
  messages: {
    create: jest.fn(),
  },
};

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => mockAnthropic);
});

const sampleCareerProfile = {
  experiences: [
    { jobTitle: 'Lead Engineer', company: 'Acme', starExperiences: [] },
  ],
  skills: { languages: ['TypeScript', 'Python'] },
  education: [],
  certifications: [],
  projects: [],
  professionalDevelopment: {},
};

const samplePersonalProfile = {
  professionalIdentity: {
    narrative: 'Experienced engineer focused on backend systems.',
  },
  coreValues: [
    { label: 'Quality', context: 'I care deeply about code quality.' },
  ],
};

const sampleAnalysisResponse = {
  company: 'Acme Corp',
  roleTitle: 'Senior Engineer',
  analysis: {
    overallSignal: 'strong',
    narrative: 'Strong match overall.',
    categories: [
      {
        name: 'Technical Skills',
        signal: 'strong',
        observations: ['TypeScript experience matches core requirement.'],
      },
    ],
  },
};

const sampleApplication = {
  id: 'app-id',
  userId: 'user-id',
  company: 'Acme Corp',
  roleTitle: 'Senior Engineer',
  jobPostingText: 'We are looking for...',
  status: 'ready' as const,
  analysis: sampleAnalysisResponse.analysis,
  appliedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ApplicationService', () => {
  let service: ApplicationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ApplicationService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockApplicationRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockCareerProfileRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPersonalProfileRepo as any,
      'test-api-key'
    );
  });

  describe('create', () => {
    it('calls Claude with job posting and profiles, creates and returns application', async () => {
      mockCareerProfileRepo.findByUserId.mockResolvedValue(sampleCareerProfile);
      mockPersonalProfileRepo.findByUserId.mockResolvedValue(
        samplePersonalProfile
      );
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          { type: 'text', text: JSON.stringify(sampleAnalysisResponse) },
        ],
      });
      mockApplicationRepo.create.mockResolvedValue(sampleApplication);

      const result = await service.create('user-id', {
        jobPostingText: 'We are looking for a Senior Engineer...',
      });

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-opus-4-6' })
      );
      expect(mockApplicationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          company: 'Acme Corp',
          roleTitle: 'Senior Engineer',
        })
      );
      expect(result.company).toBe('Acme Corp');
    });

    it('handles markdown-wrapped JSON response from Claude', async () => {
      mockCareerProfileRepo.findByUserId.mockResolvedValue(sampleCareerProfile);
      mockPersonalProfileRepo.findByUserId.mockResolvedValue(
        samplePersonalProfile
      );
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text:
              '```json\n' + JSON.stringify(sampleAnalysisResponse) + '\n```',
          },
        ],
      });
      mockApplicationRepo.create.mockResolvedValue(sampleApplication);

      await service.create('user-id', {
        jobPostingText: 'Job posting text here...',
      });

      expect(mockApplicationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ company: 'Acme Corp' })
      );
    });
  });

  describe('findAllByUserId', () => {
    it('returns all applications for a user', async () => {
      mockApplicationRepo.findAllByUserId.mockResolvedValue([
        sampleApplication,
      ]);

      const result = await service.findAllByUserId('user-id');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('app-id');
    });
  });

  describe('findById', () => {
    it('returns the application when found', async () => {
      mockApplicationRepo.findByIdAndUserId.mockResolvedValue(
        sampleApplication
      );

      const result = await service.findById('app-id', 'user-id');

      expect(result.id).toBe('app-id');
    });

    it('throws NotFoundException when not found', async () => {
      mockApplicationRepo.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.findById('missing-id', 'user-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateStatus', () => {
    it('sets appliedAt when transitioning to applied', async () => {
      mockApplicationRepo.findByIdAndUserId.mockResolvedValue(
        sampleApplication
      );
      mockApplicationRepo.updateStatus.mockResolvedValue({
        ...sampleApplication,
        status: 'applied',
        appliedAt: new Date(),
      });

      const result = await service.updateStatus('app-id', 'user-id', {
        status: 'applied',
      });

      expect(mockApplicationRepo.updateStatus).toHaveBeenCalledWith(
        'app-id',
        'user-id',
        'applied',
        expect.any(Date)
      );
      expect(result.status).toBe('applied');
    });

    it('does not set appliedAt for non-applied status', async () => {
      mockApplicationRepo.findByIdAndUserId.mockResolvedValue(
        sampleApplication
      );
      mockApplicationRepo.updateStatus.mockResolvedValue({
        ...sampleApplication,
        status: 'draft',
      });

      await service.updateStatus('app-id', 'user-id', { status: 'draft' });

      expect(mockApplicationRepo.updateStatus).toHaveBeenCalledWith(
        'app-id',
        'user-id',
        'draft',
        undefined
      );
    });

    it('throws NotFoundException when application not found', async () => {
      mockApplicationRepo.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.updateStatus('missing-id', 'user-id', { status: 'applied' })
      ).rejects.toThrow(NotFoundException);
    });
  });
});
