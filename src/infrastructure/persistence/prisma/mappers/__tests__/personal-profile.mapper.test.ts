import { PersonalProfileMapper } from '../personal-profile.mapper';
import { PersonalProfileSourceMapper } from '../personal-profile-source.mapper';

const now = new Date('2026-01-01');

const prismProfile = {
  id: 'profile-uuid',
  userId: 'user-uuid',
  professionalIdentity: { narrative: 'A senior engineer.' } as object,
  coreValues: [{ label: 'autonomy', context: null }] as object,
  createdAt: now,
  updatedAt: now,
};

const prismaSource = {
  id: 'source-uuid',
  userId: 'user-uuid',
  text: 'I care about autonomy.',
  createdAt: now,
  updatedAt: now,
};

describe('PersonalProfileMapper', () => {
  it('maps Prisma model to domain entity', () => {
    const domain = PersonalProfileMapper.toDomain(prismProfile as never);
    expect(domain.id).toBe('profile-uuid');
    expect(domain.professionalIdentity.narrative).toBe('A senior engineer.');
    expect(domain.coreValues[0].label).toBe('autonomy');
    expect(domain.createdAt).toBe(now);
  });
});

describe('PersonalProfileSourceMapper', () => {
  it('maps Prisma model to domain entity', () => {
    const domain = PersonalProfileSourceMapper.toDomain(prismaSource as never);
    expect(domain.id).toBe('source-uuid');
    expect(domain.text).toBe('I care about autonomy.');
  });
});
