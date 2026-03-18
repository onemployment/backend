import { Type } from 'class-transformer';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';

export class ProfessionalIdentityDto {
  @IsString()
  narrative!: string;
}

export class CoreValueDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  context!: string | null;
}

export class UpdatePersonalProfileDto {
  @ValidateNested()
  @Type(() => ProfessionalIdentityDto)
  professionalIdentity!: ProfessionalIdentityDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoreValueDto)
  coreValues!: CoreValueDto[];
}
