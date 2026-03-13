import { UserMapper } from '../user.mapper';
import { User as PrismaUser } from '@prisma/client';

const prismaUser: PrismaUser = {
  id: 'uuid-1',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hash',
  firstName: 'Test',
  lastName: 'User',
  displayName: null,
  googleId: null,
  emailVerified: false,
  isActive: true,
  accountCreationMethod: 'local',
  lastPasswordChange: new Date('2023-01-01'),
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  lastLoginAt: null,
};

describe('UserMapper', () => {
  it('maps all fields from Prisma to domain', () => {
    const result = UserMapper.toDomain(prismaUser);

    expect(result.id).toBe(prismaUser.id);
    expect(result.email).toBe(prismaUser.email);
    expect(result.username).toBe(prismaUser.username);
    expect(result.passwordHash).toBe(prismaUser.passwordHash);
    expect(result.firstName).toBe(prismaUser.firstName);
    expect(result.lastName).toBe(prismaUser.lastName);
    expect(result.displayName).toBeNull();
    expect(result.googleId).toBeNull();
    expect(result.emailVerified).toBe(false);
    expect(result.isActive).toBe(true);
    expect(result.accountCreationMethod).toBe('local');
    expect(result.lastPasswordChange).toEqual(prismaUser.lastPasswordChange);
    expect(result.createdAt).toEqual(prismaUser.createdAt);
    expect(result.updatedAt).toEqual(prismaUser.updatedAt);
    expect(result.lastLoginAt).toBeNull();
  });

  it('maps nullable fields correctly when populated', () => {
    const withOptionals: PrismaUser = {
      ...prismaUser,
      displayName: 'Test User',
      googleId: 'google-123',
      lastLoginAt: new Date('2023-06-01'),
    };

    const result = UserMapper.toDomain(withOptionals);

    expect(result.displayName).toBe('Test User');
    expect(result.googleId).toBe('google-123');
    expect(result.lastLoginAt).toEqual(new Date('2023-06-01'));
  });
});
