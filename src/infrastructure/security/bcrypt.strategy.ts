import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { IPasswordHashStrategy } from '../../modules/auth/ports/password-hash-strategy.port';

@Injectable()
export class BcryptStrategy implements IPasswordHashStrategy {
  constructor(private readonly saltRounds: number) {}

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
