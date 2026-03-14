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

    const storagePath = await this.fileStorage.save(buffer, `${userId}.pdf`);

    const resume = await this.resumeRepository.upsert({
      userId,
      originalFilename,
      storagePath,
      mimeType,
      sizeBytes,
    });

    if (existing) {
      await this.fileStorage.delete(existing.storagePath);
    }

    return resume;
  }

  async analyzeResume(userId: string): Promise<{ message: string }> {
    const resume = await this.resumeRepository.findByUserId(userId);
    if (!resume) {
      throw new NotFoundException('No resume found. Please upload one first.');
    }

    const buffer = await this.fileStorage.read(resume.storagePath);

    const response = await this.anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: buffer.toString('base64'),
              },
            },
            {
              type: 'text',
              text: 'What is this resume about?',
            },
          ],
        },
      ],
    });

    const text =
      response.content[0]?.type === 'text' ? response.content[0].text : '';
    return { message: text };
  }
}
