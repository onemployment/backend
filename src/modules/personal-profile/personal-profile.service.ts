import {
  Injectable,
  Inject,
  NotFoundException,
  LoggerService as ILoggerService,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { LOGGER } from '../../shared/logger/logger.port';
import {
  IPersonalProfileRepository,
  PERSONAL_PROFILE_REPOSITORY,
} from '../../domain/personal-profile/personal-profile.repository.port';
import {
  IPersonalProfileSourceRepository,
  PERSONAL_PROFILE_SOURCE_REPOSITORY,
} from '../../domain/personal-profile/personal-profile-source.repository.port';
import {
  PersonalProfile,
  ProfessionalIdentity,
  CoreValue,
} from '../../domain/personal-profile/personal-profile.entity';
import { UpdatePersonalProfileDto } from './dto/update-personal-profile.dto';

interface ExtractedPersonalProfile {
  professionalIdentity: ProfessionalIdentity;
  coreValues: CoreValue[];
}

const EMPTY_PROFILE: ExtractedPersonalProfile = {
  professionalIdentity: { narrative: '' },
  coreValues: [],
};

@Injectable()
export class PersonalProfileService {
  private readonly anthropic: Anthropic;

  constructor(
    @Inject(PERSONAL_PROFILE_REPOSITORY)
    private readonly personalProfileRepository: IPersonalProfileRepository,
    @Inject(PERSONAL_PROFILE_SOURCE_REPOSITORY)
    private readonly personalProfileSourceRepository: IPersonalProfileSourceRepository,
    @Inject('ANTHROPIC_API_KEY')
    private readonly anthropicApiKey: string,
    @Inject(LOGGER)
    private readonly logger: ILoggerService
  ) {
    this.anthropic = new Anthropic({ apiKey: this.anthropicApiKey });
  }

  async getByUserId(userId: string): Promise<PersonalProfile> {
    const profile = await this.personalProfileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('No personal profile found.');
    }
    return profile;
  }

  async extractFromText(
    userId: string,
    text: string
  ): Promise<PersonalProfile> {
    await this.personalProfileSourceRepository.upsert({ userId, text });

    const response = await this.anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are extracting a structured personal professional profile from freeform user-written text.
Return ONLY valid JSON with no markdown, no code fences, no explanation.

The JSON must follow this exact structure:

{
  "professionalIdentity": {
    "narrative": "string (1-3 sentences describing who this person is professionally)"
  },
  "coreValues": [
    {
      "label": "string (short value label, e.g. 'autonomy', 'impact')",
      "context": "string or null (optional explanation of why this value matters to them)"
    }
  ]
}

Rules:
- Extract only what can be reasonably inferred from the text. Never fabricate.
- If no professional identity can be inferred, use an empty string for narrative.
- If no values can be inferred, return an empty array for coreValues.
- Keep narrative concise: 1-3 sentences maximum.

User text:
${text}`,
        },
      ],
    });

    const raw =
      response.content[0]?.type === 'text' ? response.content[0].text : '{}';

    this.logger.log(
      `Claude raw response for userId=${userId}: ${raw}`,
      'PersonalProfileService'
    );

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    let extracted: ExtractedPersonalProfile = EMPTY_PROFILE;
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      extracted = EMPTY_PROFILE;
    }

    return this.personalProfileRepository.upsert({
      userId,
      professionalIdentity:
        extracted.professionalIdentity ?? EMPTY_PROFILE.professionalIdentity,
      coreValues: extracted.coreValues ?? [],
    });
  }

  async update(
    userId: string,
    dto: UpdatePersonalProfileDto
  ): Promise<PersonalProfile> {
    const existing = await this.personalProfileRepository.findByUserId(userId);
    if (!existing) {
      throw new NotFoundException('No personal profile found.');
    }
    return this.personalProfileRepository.upsert({
      userId,
      professionalIdentity: dto.professionalIdentity,
      coreValues: dto.coreValues,
    });
  }
}
