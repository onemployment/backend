import { IsString, IsNotEmpty } from 'class-validator';

export class ExtractPersonalProfileDto {
  @IsString()
  @IsNotEmpty()
  text!: string;
}
