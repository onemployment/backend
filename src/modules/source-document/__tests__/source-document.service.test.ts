import { BadRequestException } from '@nestjs/common';
import { SourceDocumentService } from '../source-document.service';
import { ISourceDocumentRepository } from '../../../domain/source-document/source-document.repository.port';
import { IFileStorage } from '../../../domain/source-document/file-storage.port';
import { SourceDocument } from '../../../domain/source-document/source-document.entity';

const mockDoc: SourceDocument = {
  id: 'doc-uuid',
  userId: 'user-uuid',
  originalFilename: 'cv.pdf',
  storagePath: 'uploads/resumes/user-uuid.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockRepo: jest.Mocked<ISourceDocumentRepository> = {
  findByUserId: jest.fn(),
  upsert: jest.fn(),
  deleteByUserId: jest.fn(),
};

const mockStorage: jest.Mocked<IFileStorage> = {
  save: jest.fn(),
  read: jest.fn(),
  delete: jest.fn(),
};

describe('SourceDocumentService', () => {
  let service: SourceDocumentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SourceDocumentService(mockRepo, mockStorage, {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as never);
  });

  it('throws BadRequestException if file is not a PDF', async () => {
    await expect(
      service.uploadSourceDocument(
        'user-uuid',
        Buffer.from(''),
        'file.docx',
        'application/msword',
        1024
      )
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException if file exceeds 10MB', async () => {
    await expect(
      service.uploadSourceDocument(
        'user-uuid',
        Buffer.from(''),
        'cv.pdf',
        'application/pdf',
        11 * 1024 * 1024
      )
    ).rejects.toThrow(BadRequestException);
  });

  it('saves file and upserts metadata, returns SourceDocument entity', async () => {
    mockStorage.save.mockResolvedValue('uploads/resumes/user-uuid.pdf');
    mockRepo.upsert.mockResolvedValue(mockDoc);

    const result = await service.uploadSourceDocument(
      'user-uuid',
      Buffer.from('pdf'),
      'cv.pdf',
      'application/pdf',
      1024
    );

    expect(mockStorage.save).toHaveBeenCalledWith(
      Buffer.from('pdf'),
      'user-uuid.pdf'
    );
    expect(mockRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid',
        originalFilename: 'cv.pdf',
      })
    );
    expect(result.id).toBe('doc-uuid');
  });

  it('findByUserId returns document from repository', async () => {
    mockRepo.findByUserId.mockResolvedValue(mockDoc);
    const result = await service.findByUserId('user-uuid');
    expect(result?.id).toBe('doc-uuid');
  });
});
