import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterUserDto {
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one lowercase letter, one uppercase letter, and one digit',
  })
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(39)
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/, {
    message: 'Username must be 1-39 characters, start and end with alphanumeric, and can contain hyphens',
  })
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s\-'.]+$/, {
    message: "First name can only contain letters, spaces, hyphens, apostrophes, and dots",
  })
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s\-'.]+$/, {
    message: "Last name can only contain letters, spaces, hyphens, apostrophes, and dots",
  })
  lastName!: string;
}
