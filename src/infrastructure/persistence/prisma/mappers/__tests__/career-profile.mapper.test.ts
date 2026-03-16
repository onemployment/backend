import { CareerProfileMapper } from '../career-profile.mapper';

const prismaProfile = {
  id: 'profile-uuid',
  userId: 'user-uuid',
  extractionStatus: 'completed',
  lastExtractedAt: new Date('2026-03-15T10:00:00.000Z'),
  sourceDocumentId: 'doc-uuid',
  experiences: [
    {
      jobTitle: 'Software Engineer',
      company: 'Acme',
      location: 'Vancouver',
      startDate: 'January 2022',
      endDate: null,
      employmentType: 'Full-time',
      starExperiences: [
        {
          title: 'Built search',
          situation: 'S',
          task: 'T',
          action: 'A',
          result: 'R',
          quantifiedMetrics: ['50% faster'],
          domainContext: 'SaaS',
        },
      ],
    },
  ],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('CareerProfileMapper', () => {
  it('maps all Prisma fields to domain entity', () => {
    const domain = CareerProfileMapper.toDomain(prismaProfile as never);

    expect(domain.id).toBe('profile-uuid');
    expect(domain.userId).toBe('user-uuid');
    expect(domain.extractionStatus).toBe('completed');
    expect(domain.lastExtractedAt).toEqual(
      new Date('2026-03-15T10:00:00.000Z')
    );
    expect(domain.sourceDocumentId).toBe('doc-uuid');
    expect(domain.experiences).toHaveLength(1);
    expect(domain.experiences[0].jobTitle).toBe('Software Engineer');
    expect(domain.experiences[0].starExperiences[0].title).toBe('Built search');
  });
});
