import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(50, {
    message: 'Job posting text is too short to be a real posting',
  })
  jobPostingText!: string;
}
