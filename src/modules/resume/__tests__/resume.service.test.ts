import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResumeService } from '../resume.service';
import { IResumeRepository } from '../../../domain/resume/resume.repository.port';
import { IFileStorage } from '../../../domain/resume/file-storage.port';
import { Resume } from '../../../domain/resume/resume.entity';

const mockResume: Resume = {
  id: 'resume-uuid',
  userId: 'user-uuid',
  originalFilename: 'cv.pdf',
  storagePath: 'uploads/resumes/user-uuid.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockRepo: jest.Mocked<IResumeRepository> = {
  findByUserId: jest.fn(),
  upsert: jest.fn(),
  deleteByUserId: jest.fn(),
};

const mockStorage: jest.Mocked<IFileStorage> = {
  save: jest.fn(),
  read: jest.fn(),
  delete: jest.fn(),
};

// Prevent real Anthropic client from being created
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.messages = { create: jest.fn() };
  }),
}));

describe('ResumeService - upload', () => {
  let service: ResumeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ResumeService(mockRepo, mockStorage, 'test-api-key');
  });

  it('throws BadRequestException if file is not a PDF', async () => {
    await expect(
      service.uploadResume('user-uuid', Buffer.from(''), 'resume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1024)
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException if file exceeds 10MB', async () => {
    const overLimit = 11 * 1024 * 1024;
    await expect(
      service.uploadResume('user-uuid', Buffer.from(''), 'cv.pdf', 'application/pdf', overLimit)
    ).rejects.toThrow(BadRequestException);
  });

  it('deletes old file if resume already exists before saving new one', async () => {
    mockRepo.findByUserId.mockResolvedValue(mockResume);
    mockStorage.save.mockResolvedValue('uploads/resumes/user-uuid.pdf');
    mockRepo.upsert.mockResolvedValue(mockResume);

    await service.uploadResume('user-uuid', Buffer.from('pdf'), 'cv.pdf', 'application/pdf', 1024);

    expect(mockStorage.delete).toHaveBeenCalledWith(mockResume.storagePath);
  });

  it('does not attempt delete if no prior resume', async () => {
    mockRepo.findByUserId.mockResolvedValue(null);
    mockStorage.save.mockResolvedValue('uploads/resumes/user-uuid.pdf');
    mockRepo.upsert.mockResolvedValue(mockResume);

    await service.uploadResume('user-uuid', Buffer.from('pdf'), 'cv.pdf', 'application/pdf', 1024);

    expect(mockStorage.delete).not.toHaveBeenCalled();
  });

  it('saves file and upserts metadata, returns Resume entity', async () => {
    mockRepo.findByUserId.mockResolvedValue(null);
    mockStorage.save.mockResolvedValue('uploads/resumes/user-uuid.pdf');
    mockRepo.upsert.mockResolvedValue(mockResume);

    const result = await service.uploadResume('user-uuid', Buffer.from('pdf'), 'cv.pdf', 'application/pdf', 1024);

    expect(mockStorage.save).toHaveBeenCalledWith(Buffer.from('pdf'), 'user-uuid.pdf');
    expect(mockRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid', originalFilename: 'cv.pdf' })
    );
    expect(result.id).toBe('resume-uuid');
  });
});

describe('ResumeService - analyze', () => {
  let service: ResumeService;
  let mockAnthropicCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const Anthropic = require('@anthropic-ai/sdk').default;
    Anthropic.mockClear();
    service = new ResumeService(mockRepo, mockStorage, 'test-api-key');
    const instance = Anthropic.mock.instances[0];
    mockAnthropicCreate = instance.messages.create;
  });

  it('throws NotFoundException if user has no resume', async () => {
    mockRepo.findByUserId.mockResolvedValue(null);
    await expect(service.analyzeResume('user-uuid')).rejects.toThrow(NotFoundException);
  });

  it('reads file, calls Claude, and returns message', async () => {
    mockRepo.findByUserId.mockResolvedValue(mockResume);
    mockStorage.read.mockResolvedValue(Buffer.from('pdf content'));
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'This is a software engineer resume.' }],
    });

    const result = await service.analyzeResume('user-uuid');

    expect(mockStorage.read).toHaveBeenCalledWith(mockResume.storagePath);
    expect(result.message).toBe('This is a software engineer resume.');
  });
});
