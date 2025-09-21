import bcrypt from 'bcrypt';
import { IPasswordStrategy } from './contracts/password-strategy.contract';

export class BcryptStrategy extends IPasswordStrategy {
  constructor(private readonly saltRounds: number) {
    super();
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
