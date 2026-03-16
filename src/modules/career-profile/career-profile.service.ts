import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  ICareerProfileRepository,
  CAREER_PROFILE_REPOSITORY,
} from '../../domain/career-profile/career-profile.repository.port';
import {
  ISourceDocumentRepository,
  SOURCE_DOCUMENT_REPOSITORY,
} from '../../domain/source-document/source-document.repository.port';
import {
  IFileStorage,
  FILE_STORAGE,
} from '../../domain/source-document/file-storage.port';
import {
  CareerProfile,
  ProfessionalExperience,
} from '../../domain/career-profile/career-profile.entity';

@Injectable()
export class CareerProfileService {
  private readonly anthropic: Anthropic;

  constructor(
    @Inject(CAREER_PROFILE_REPOSITORY)
    private readonly careerProfileRepository: ICareerProfileRepository,
    @Inject(SOURCE_DOCUMENT_REPOSITORY)
    private readonly sourceDocumentRepository: ISourceDocumentRepository,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: IFileStorage,
    @Inject('ANTHROPIC_API_KEY')
    private readonly anthropicApiKey: string
  ) {
    this.anthropic = new Anthropic({ apiKey: this.anthropicApiKey });
  }

  async extractFromSourceDocument(userId: string): Promise<CareerProfile> {
    const sourceDocument =
      await this.sourceDocumentRepository.findByUserId(userId);
    if (!sourceDocument) {
      throw new NotFoundException(
        'No source document found. Please upload one first.'
      );
    }

    const buffer = await this.fileStorage.read(sourceDocument.storagePath);

    const response = await this.anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
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
              text: `Extract all professional experiences from this resume as a JSON array. Return ONLY a valid JSON array with no other text, markdown, or explanation.

Each element must follow this exact structure:
{
  "jobTitle": "string",
  "company": "string",
  "location": "string or null",
  "startDate": "string",
  "endDate": "string or null (null if current role)",
  "employmentType": "string or null",
  "starExperiences": [
    {
      "title": "string (brief title for this accomplishment)",
      "situation": "string (context and background)",
      "task": "string (what needed to be done)",
      "action": "string (specific actions taken)",
      "result": "string (outcome and impact)",
      "quantifiedMetrics": ["string (measurable results if any)"],
      "domainContext": "string or null (business domain or industry context)"
    }
  ]
}

Extract as many starExperiences per job as the resume supports. Return only the JSON array.`,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0]?.type === 'text' ? response.content[0].text : '[]';

    let experiences: ProfessionalExperience[] = [];
    try {
      experiences = JSON.parse(text);
    } catch {
      experiences = [];
    }

    return this.careerProfileRepository.upsert({
      userId,
      extractionStatus: 'completed',
      lastExtractedAt: new Date(),
      sourceDocumentId: sourceDocument.id,
      experiences,
    });
  }
}
