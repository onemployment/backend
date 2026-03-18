import { NotFoundException } from '@nestjs/common';
import { PersonalProfileService } from '../personal-profile.service';
import { IPersonalProfileRepository } from '../../../domain/personal-profile/personal-profile.repository.port';
import { IPersonalProfileSourceRepository } from '../../../domain/personal-profile/personal-profile-source.repository.port';
import { PersonalProfile } from '../../../domain/personal-profile/personal-profile.entity';
import { PersonalProfileSource } from '../../../domain/personal-profile/personal-profile-source.entity';

const mockProfile: PersonalProfile = {
  id: 'profile-uuid',
  userId: 'user-uuid',
  professionalIdentity: {
    narrative: 'A senior engineer focused on distributed systems.',
  },
  coreValues: [
    { label: 'autonomy', context: 'I work best when given ownership.' },
    { label: 'impact', context: null },
  ],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockSource: PersonalProfileSource = {
  id: 'source-uuid',
  userId: 'user-uuid',
  text: 'I am a senior engineer who values autonomy and impact.',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockProfileRepo: jest.Mocked<IPersonalProfileRepository> = {
  findByUserId: jest.fn(),
  upsert: jest.fn(),
};

const mockSourceRepo: jest.Mocked<IPersonalProfileSourceRepository> = {
  findByUserId: jest.fn(),
  upsert: jest.fn(),
};

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(function (
    this: Record<string, unknown>
  ) {
    this.messages = { create: jest.fn() };
  }),
}));

describe('PersonalProfileService', () => {
  let service: PersonalProfileService;
  let mockAnthropicCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const Anthropic = require('@anthropic-ai/sdk').default;
    Anthropic.mockClear();
    service = new PersonalProfileService(
      mockProfileRepo,
      mockSourceRepo,
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

  describe('getByUserId', () => {
    it('returns the personal profile when found', async () => {
      mockProfileRepo.findByUserId.mockResolvedValue(mockProfile);
      const result = await service.getByUserId('user-uuid');
      expect(result.id).toBe('profile-uuid');
    });

    it('throws NotFoundException when profile does not exist', async () => {
      mockProfileRepo.findByUserId.mockResolvedValue(null);
      await expect(service.getByUserId('user-uuid')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('extractFromText', () => {
    it('persists source text, calls Claude, upserts and returns PersonalProfile', async () => {
      mockSourceRepo.upsert.mockResolvedValue(mockSource);
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              professionalIdentity: mockProfile.professionalIdentity,
              coreValues: mockProfile.coreValues,
            }),
          },
        ],
      });
      mockProfileRepo.upsert.mockResolvedValue(mockProfile);

      const result = await service.extractFromText(
        'user-uuid',
        'I am a senior engineer...'
      );

      expect(mockSourceRepo.upsert).toHaveBeenCalledWith({
        userId: 'user-uuid',
        text: 'I am a senior engineer...',
      });
      expect(mockAnthropicCreate).toHaveBeenCalledTimes(1);
      expect(mockProfileRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid',
          professionalIdentity: mockProfile.professionalIdentity,
          coreValues: mockProfile.coreValues,
        })
      );
      expect(result.id).toBe('profile-uuid');
    });

    it('upserts with empty values when Claude returns invalid JSON', async () => {
      mockSourceRepo.upsert.mockResolvedValue(mockSource);
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'not valid json' }],
      });
      mockProfileRepo.upsert.mockResolvedValue({
        ...mockProfile,
        professionalIdentity: { narrative: '' },
        coreValues: [],
      });

      await service.extractFromText('user-uuid', 'some text');

      expect(mockProfileRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          professionalIdentity: { narrative: '' },
          coreValues: [],
        })
      );
    });

    it('strips markdown code fences from Claude response before parsing', async () => {
      mockSourceRepo.upsert.mockResolvedValue(mockSource);
      const payload = {
        professionalIdentity: mockProfile.professionalIdentity,
        coreValues: mockProfile.coreValues,
      };
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```json\n' + JSON.stringify(payload) + '\n```',
          },
        ],
      });
      mockProfileRepo.upsert.mockResolvedValue(mockProfile);

      await service.extractFromText('user-uuid', 'some text');

      expect(mockProfileRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          professionalIdentity: mockProfile.professionalIdentity,
          coreValues: mockProfile.coreValues,
        })
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when profile does not exist', async () => {
      mockProfileRepo.findByUserId.mockResolvedValue(null);
      await expect(
        service.update('user-uuid', {
          professionalIdentity: { narrative: 'test' },
          coreValues: [],
        })
      ).rejects.toThrow(NotFoundException);
      expect(mockProfileRepo.upsert).not.toHaveBeenCalled();
    });

    it('upserts and returns updated profile', async () => {
      mockProfileRepo.findByUserId.mockResolvedValue(mockProfile);
      const updated = {
        ...mockProfile,
        professionalIdentity: { narrative: 'Updated narrative.' },
      };
      mockProfileRepo.upsert.mockResolvedValue(updated);

      const result = await service.update('user-uuid', {
        professionalIdentity: { narrative: 'Updated narrative.' },
        coreValues: mockProfile.coreValues,
      });

      expect(mockProfileRepo.upsert).toHaveBeenCalledWith({
        userId: 'user-uuid',
        professionalIdentity: { narrative: 'Updated narrative.' },
        coreValues: mockProfile.coreValues,
      });
      expect(result.professionalIdentity.narrative).toBe('Updated narrative.');
    });
  });
});
