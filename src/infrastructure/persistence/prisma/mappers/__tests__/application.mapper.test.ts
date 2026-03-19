import { ApplicationMapper } from '../application.mapper';
import { Application as PrismaApplication } from '@prisma/client';

const baseRaw: PrismaApplication = {
  id: 'app-id',
  userId: 'user-id',
  company: 'Acme Corp',
  roleTitle: 'Senior Engineer',
  jobPostingText: 'We are looking for...',
  status: 'ready',
  analysis: {
    overallSignal: 'strong',
    narrative: 'Great fit overall.',
    categories: [
      {
        name: 'Technical Skills',
        signal: 'strong',
        observations: ['Node.js matches'],
      },
    ],
  },
  appliedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

describe('ApplicationMapper', () => {
  describe('toDomain', () => {
    it('maps a Prisma Application to domain entity', () => {
      const result = ApplicationMapper.toDomain(baseRaw);

      expect(result.id).toBe('app-id');
      expect(result.userId).toBe('user-id');
      expect(result.company).toBe('Acme Corp');
      expect(result.roleTitle).toBe('Senior Engineer');
      expect(result.jobPostingText).toBe('We are looking for...');
      expect(result.status).toBe('ready');
      expect(result.analysis).toEqual(baseRaw.analysis);
      expect(result.appliedAt).toBeNull();
    });

    it('returns null for analysis when stored as empty object', () => {
      const raw = { ...baseRaw, analysis: {} };
      const result = ApplicationMapper.toDomain(raw);
      expect(result.analysis).toBeNull();
    });

    it('maps appliedAt when present', () => {
      const appliedAt = new Date('2026-02-01');
      const raw = { ...baseRaw, appliedAt };
      const result = ApplicationMapper.toDomain(raw);
      expect(result.appliedAt).toEqual(appliedAt);
    });
  });
});
