import { BcryptStrategy } from '../bcrypt.strategy';

describe('BcryptStrategy', () => {
  let strategy: BcryptStrategy;

  beforeEach(() => {
    strategy = new BcryptStrategy(10);
  });

  it('should hash a password', async () => {
    const hash = await strategy.hash('password123');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('password123');
  });

  it('should verify a correct password', async () => {
    const hash = await strategy.hash('password123');
    const result = await strategy.verify('password123', hash);
    expect(result).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hash = await strategy.hash('password123');
    const result = await strategy.verify('wrongpassword', hash);
    expect(result).toBe(false);
  });
});
