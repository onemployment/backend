import {
  Injectable,
  Inject,
  NotFoundException,
  LoggerService as ILoggerService,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { LOGGER } from '../../shared/logger/logger.port';
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
  Education,
  Certification,
  Project,
  Skills,
  ProfessionalDevelopment,
} from '../../domain/career-profile/career-profile.entity';

interface ExtractedProfile {
  experiences: ProfessionalExperience[];
  education: Education[];
  certifications: Certification[];
  projects: Project[];
  skills: Skills;
  professionalDevelopment: ProfessionalDevelopment;
}

const EMPTY_PROFILE: ExtractedProfile = {
  experiences: [],
  education: [],
  certifications: [],
  projects: [],
  skills: {},
  professionalDevelopment: {},
};

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
    private readonly anthropicApiKey: string,
    @Inject(LOGGER)
    private readonly logger: ILoggerService
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
      max_tokens: 8192,
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
              text: `Extract the complete professional profile from this resume as a single JSON object. Return ONLY valid JSON with no markdown, no code fences, no explanation.

The JSON must follow this exact structure (use empty arrays/objects for sections not present in the resume):

{
  "experiences": [
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
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "graduationDate": "string or null",
      "gpa": "string or null",
      "relevantCoursework": ["string"],
      "honors": ["string"],
      "thesisProject": "string or null"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuingOrganization": "string or null",
      "dateObtained": "string or null",
      "expirationDate": "string or null",
      "credentialId": "string or null"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologiesUsed": ["string"],
      "duration": "string or null",
      "role": "string or null",
      "outcomes": ["string"],
      "repositoryUrl": "string or null"
    }
  ],
  "skills": {
    "language": ["string"],
    "framework": ["string"],
    "database": ["string"],
    "tool": ["string"],
    "cloud": ["string"],
    "soft": ["string"]
  },
  "professionalDevelopment": {
    "book": ["string (title only)"],
    "course": ["string (title only)"]
  }
}

Rules:
- Extract only what is factually present in the document. Never fabricate.
- Use empty arrays [] or empty objects {} for sections not found in the resume.
- For skills, use descriptive category keys. Include only categories that have at least one entry.
- For professionalDevelopment, use type-as-category keys (book, course, conference, etc.). Include only categories found in the resume.
- Extract as many starExperiences per job as the resume supports.`,
            },
          ],
        },
      ],
    });

    const raw =
      response.content[0]?.type === 'text' ? response.content[0].text : '{}';

    this.logger.log(
      `Claude raw response for userId=${userId}: ${raw}`,
      'CareerProfileService'
    );

    const text = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    let extracted: ExtractedProfile = EMPTY_PROFILE;
    try {
      extracted = JSON.parse(text);
    } catch {
      extracted = EMPTY_PROFILE;
    }

    return this.careerProfileRepository.upsert({
      userId,
      extractionStatus: 'completed',
      lastExtractedAt: new Date(),
      sourceDocumentId: sourceDocument.id,
      experiences: extracted.experiences ?? [],
      education: extracted.education ?? [],
      certifications: extracted.certifications ?? [],
      projects: extracted.projects ?? [],
      skills: extracted.skills ?? {},
      professionalDevelopment: extracted.professionalDevelopment ?? {},
    });
  }
}
