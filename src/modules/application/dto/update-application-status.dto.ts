import { IsIn, IsString } from 'class-validator';

export class UpdateApplicationStatusDto {
  @IsString()
  @IsIn(['draft', 'ready', 'applied'], {
    message: 'status must be one of: draft, ready, applied',
  })
  status!: string;
}
