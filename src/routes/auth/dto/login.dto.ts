import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid request' })
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
