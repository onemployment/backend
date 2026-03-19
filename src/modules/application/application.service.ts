import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  APPLICATION_REPOSITORY,
  ApplicationRepositoryPort,
} from '../../domain/application/application.repository.port';
import { Application } from '../../domain/application/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import {
  ICareerProfileRepository,
  CAREER_PROFILE_REPOSITORY,
} from '../../domain/career-profile/career-profile.repository.port';
import {
  IPersonalProfileRepository,
  PERSONAL_PROFILE_REPOSITORY,
} from '../../domain/personal-profile/personal-profile.repository.port';

@Injectable()
export class ApplicationService {
  private readonly anthropic: Anthropic;

  constructor(
    @Inject(APPLICATION_REPOSITORY)
    private readonly applicationRepo: ApplicationRepositoryPort,
    @Inject(CAREER_PROFILE_REPOSITORY)
    private readonly careerProfileRepo: ICareerProfileRepository,
    @Inject(PERSONAL_PROFILE_REPOSITORY)
    private readonly personalProfileRepo: IPersonalProfileRepository,
    @Inject('ANTHROPIC_API_KEY')
    private readonly anthropicApiKey: string
  ) {
    this.anthropic = new Anthropic({ apiKey: this.anthropicApiKey });
  }

  async create(
    userId: string,
    dto: CreateApplicationDto
  ): Promise<Application> {
    const [careerProfile, personalProfile] = await Promise.all([
      this.careerProfileRepo.findByUserId(userId),
      this.personalProfileRepo.findByUserId(userId),
    ]);

    const prompt = this.buildAnalysisPrompt(
      dto.jobPostingText,
      careerProfile,
      personalProfile
    );

    const response = await this.anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw =
      response.content[0]?.type === 'text' ? response.content[0].text : '{}';
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    const extracted = JSON.parse(cleaned) as {
      company: string;
      roleTitle: string;
      analysis: Application['analysis'];
    };

    return this.applicationRepo.create({
      userId,
      company: extracted.company,
      roleTitle: extracted.roleTitle,
      jobPostingText: dto.jobPostingText,
      analysis: extracted.analysis,
    });
  }

  async findAllByUserId(userId: string): Promise<Application[]> {
    return this.applicationRepo.findAllByUserId(userId);
  }

  async findById(id: string, userId: string): Promise<Application> {
    const application = await this.applicationRepo.findByIdAndUserId(
      id,
      userId
    );
    if (!application) {
      throw new NotFoundException(`Application not found`);
    }
    return application;
  }

  async updateStatus(
    id: string,
    userId: string,
    dto: UpdateApplicationStatusDto
  ): Promise<Application> {
    const application = await this.applicationRepo.findByIdAndUserId(
      id,
      userId
    );
    if (!application) {
      throw new NotFoundException(`Application not found`);
    }

    const appliedAt = dto.status === 'applied' ? new Date() : undefined;
    return this.applicationRepo.updateStatus(
      id,
      userId,
      dto.status as Application['status'],
      appliedAt
    );
  }

  private buildAnalysisPrompt(
    jobPostingText: string,
    careerProfile: unknown,
    personalProfile: unknown
  ): string {
    return `You are analyzing a job posting for a candidate. Your job is to assess the fit between the candidate's profile and the job requirements, and produce a structured JSON response.

## Job Posting
${jobPostingText}

## Candidate Career Profile
${JSON.stringify(careerProfile, null, 2)}

## Candidate Personal Profile
${JSON.stringify(personalProfile, null, 2)}

## Instructions
Analyze the job posting and the candidate's profile. Return a JSON object with this exact structure:

{
  "company": "<extracted company name>",
  "roleTitle": "<extracted role title>",
  "analysis": {
    "overallSignal": "<strong|moderate|weak>",
    "narrative": "<2-4 sentences: overall fit assessment and tailoring intent — what you will lean on and what you need to work around>",
    "categories": [
      {
        "name": "<category name derived from job posting structure, e.g. Technical Skills, Leadership, Domain Knowledge>",
        "signal": "<strong|partial|gap>",
        "observations": [
          "<specific observation about the candidate's profile relative to this category — descriptive, referencing actual profile data>",
          "<2-4 observations per category>"
        ]
      }
    ]
  }
}

Rules:
- Categories must be dynamic — derive them from the job posting's own structure and emphasis, not a fixed list
- Observations must be descriptive and specific — reference actual experiences, skills, or values from the candidate's profile
- The narrative should state how you intend to tailor application materials — "I will lean on X, work around Y"
- Do not fabricate skills or experiences not present in the profile
- Return only valid JSON, no markdown fencing`;
  }
}
