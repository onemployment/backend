import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';

export class StarExperienceDto {
  @IsString()
  title!: string;

  @IsString()
  situation!: string;

  @IsString()
  task!: string;

  @IsString()
  action!: string;

  @IsString()
  result!: string;

  @IsArray()
  @IsString({ each: true })
  quantifiedMetrics!: string[];

  @IsOptional()
  @IsString()
  domainContext!: string | null;
}

export class ProfessionalExperienceDto {
  @IsString()
  jobTitle!: string;

  @IsString()
  company!: string;

  @IsOptional()
  @IsString()
  location!: string | null;

  @IsString()
  startDate!: string;

  @IsOptional()
  @IsString()
  endDate!: string | null;

  @IsOptional()
  @IsString()
  employmentType!: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StarExperienceDto)
  starExperiences!: StarExperienceDto[];
}

export class EducationDto {
  @IsString()
  degree!: string;

  @IsString()
  institution!: string;

  @IsOptional()
  @IsString()
  graduationDate!: string | null;

  @IsOptional()
  @IsString()
  gpa!: string | null;

  @IsArray()
  @IsString({ each: true })
  relevantCoursework!: string[];

  @IsArray()
  @IsString({ each: true })
  honors!: string[];

  @IsOptional()
  @IsString()
  thesisProject!: string | null;
}

export class CertificationDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  issuingOrganization!: string | null;

  @IsOptional()
  @IsString()
  dateObtained!: string | null;

  @IsOptional()
  @IsString()
  expirationDate!: string | null;

  @IsOptional()
  @IsString()
  credentialId!: string | null;
}

export class ProjectDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  technologiesUsed!: string[];

  @IsOptional()
  @IsString()
  duration!: string | null;

  @IsOptional()
  @IsString()
  role!: string | null;

  @IsArray()
  @IsString({ each: true })
  outcomes!: string[];

  @IsOptional()
  @IsString()
  repositoryUrl!: string | null;
}

export class UpdateCareerProfileDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfessionalExperienceDto)
  experiences!: ProfessionalExperienceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education!: EducationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications!: CertificationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  projects!: ProjectDto[];

  @IsObject()
  skills!: Record<string, string[]>;

  @IsObject()
  professionalDevelopment!: Record<string, string[]>;
}
