import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  IResumeRepository,
  RESUME_REPOSITORY,
} from '../../domain/resume/resume.repository.port';
import { IFileStorage, FILE_STORAGE } from '../../domain/resume/file-storage.port';
import { Resume } from '../../domain/resume/resume.entity';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = 'application/pdf';

@Injectable()
export class ResumeService {
  private readonly anthropic: Anthropic;

  constructor(
    @Inject(RESUME_REPOSITORY) private readonly resumeRepository: IResumeRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: IFileStorage,
    @Inject('ANTHROPIC_API_KEY') private readonly anthropicApiKey: string
  ) {
    this.anthropic = new Anthropic({ apiKey: this.anthropicApiKey });
  }

  async uploadResume(
    userId: string,
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    sizeBytes: number
  ): Promise<Resume> {
    if (mimeType !== ALLOWED_MIME) {
      throw new BadRequestException('Only PDF files are allowed');
    }
    if (sizeBytes > MAX_FILE_SIZE) {
      throw new BadRequestException('File size must not exceed 10MB');
    }

    const existing = await this.resumeRepository.findByUserId(userId);
    if (existing) {
      await this.fileStorage.delete(existing.storagePath);
    }

    const storagePath = await this.fileStorage.save(buffer, `${userId}.pdf`);

    return this.resumeRepository.upsert({
      userId,
      originalFilename,
      storagePath,
      mimeType,
      sizeBytes,
    });
  }

  async analyzeResume(_userId: string): Promise<{ message: string }> {
    throw new NotFoundException('Not yet implemented');
  }
}
