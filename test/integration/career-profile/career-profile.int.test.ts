import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../src/infrastructure/persistence/prisma/prisma.client';
import {
  createTestApp,
  createTestUser,
  createTestJWT,
  TestAppSetup,
} from '../helpers/utils';

const validBody = {
  experiences: [
    {
      jobTitle: 'Engineer',
      company: 'Acme',
      location: null,
      startDate: '2022-01',
      endDate: null,
      employmentType: 'Full-time',
      starExperiences: [
        {
          title: 'Built system',
          situation: 'We needed X',
          task: 'Build X',
          action: 'I did Y',
          result: 'Outcome Z',
          quantifiedMetrics: ['50% faster'],
          domainContext: null,
        },
      ],
    },
  ],
  education: [
    {
      degree: 'BSc Computer Science',
      institution: 'State University',
      graduationDate: '2020',
      gpa: null,
      relevantCoursework: [],
      honors: [],
      thesisProject: null,
    },
  ],
  certifications: [],
  projects: [],
  skills: { backend: ['NestJS', 'Node.js'] },
  professionalDevelopment: { book: ['Clean Code'] },
};

async function seedCareerProfile(prismaService: PrismaService, userId: string) {
  await prismaService.careerProfile.create({
    data: {
      userId,
      extractionStatus: 'completed',
      experiences: [],
      education: [],
      certifications: [],
      projects: [],
      skills: {},
      professionalDevelopment: {},
    },
  });
}

describe('Career Profile Integration Tests', () => {
  let testSetup: TestAppSetup;
  let app: INestApplication;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  beforeAll(async () => {
    testSetup = await createTestApp();
    app = testSetup.app;
    jwtService = testSetup.jwtService;
    prismaService = testSetup.prismaService;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PUT /api/v1/career-profile', () => {
    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/career-profile')
        .send(validBody)
        .expect(401);
    });

    it('returns 404 when user has no career profile', async () => {
      const testUser = await createTestUser(prismaService, {
        email: 'put-no-profile@example.com',
        username: 'putnoProfile',
      });
      const token = createTestJWT(jwtService, testUser);

      await request(app.getHttpServer())
        .put('/api/v1/career-profile')
        .set('Authorization', `Bearer ${token}`)
        .send(validBody)
        .expect(404);
    });

    it('returns 400 when body is structurally invalid', async () => {
      const testUser = await createTestUser(prismaService, {
        email: 'put-invalid-body@example.com',
        username: 'putInvalidBody',
      });
      const token = createTestJWT(jwtService, testUser);

      await request(app.getHttpServer())
        .put('/api/v1/career-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ experiences: 'not-an-array' })
        .expect(400);
    });

    it('updates and returns the career profile with new section data', async () => {
      const testUser = await createTestUser(prismaService, {
        email: 'put-update@example.com',
        username: 'putUpdate',
      });
      await seedCareerProfile(prismaService, testUser.id);
      const token = createTestJWT(jwtService, testUser);

      const response = await request(app.getHttpServer())
        .put('/api/v1/career-profile')
        .set('Authorization', `Bearer ${token}`)
        .send(validBody)
        .expect(200);

      expect(response.body.skills).toEqual({ backend: ['NestJS', 'Node.js'] });
      expect(response.body.experiences).toHaveLength(1);
      expect(response.body.experiences[0].jobTitle).toBe('Engineer');
    });
  });

  describe('GET /api/v1/career-profile', () => {
    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/career-profile')
        .expect(401);
    });

    it('returns 404 when user has no career profile', async () => {
      const testUser = await createTestUser(prismaService, {
        email: 'nocareerprofile@example.com',
        username: 'nocareerprofileuser',
      });
      const token = createTestJWT(jwtService, testUser);

      await request(app.getHttpServer())
        .get('/api/v1/career-profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
