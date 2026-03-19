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

describe('Application Integration Tests', () => {
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

  describe('GET /api/v1/applications', () => {
    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/applications')
        .expect(401);
    });

    it('returns empty array when user has no applications', async () => {
      const user = await createTestUser(prismaService, {
        email: 'apptest-list@example.com',
        username: 'apptestlist',
      });
      const token = createTestJWT(jwtService, user);

      const res = await request(app.getHttpServer())
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns seeded applications', async () => {
      const user = await createTestUser(prismaService, {
        email: 'apptest-list2@example.com',
        username: 'apptestlist2',
      });
      const token = createTestJWT(jwtService, user);

      await prismaService.application.create({
        data: {
          userId: user.id,
          company: 'Acme Corp',
          roleTitle: 'Senior Engineer',
          jobPostingText: 'Looking for an engineer...',
          status: 'ready',
          analysis: {
            overallSignal: 'strong',
            narrative: 'Great fit',
            categories: [],
          },
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].company).toBe('Acme Corp');
      expect(res.body[0].roleTitle).toBe('Senior Engineer');
      expect(res.body[0].status).toBe('ready');
    });
  });

  describe('GET /api/v1/applications/:id', () => {
    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/applications/some-id')
        .expect(401);
    });

    it('returns 404 when application does not exist', async () => {
      const user = await createTestUser(prismaService, {
        email: 'apptest-getone@example.com',
        username: 'apptestgetone',
      });
      const token = createTestJWT(jwtService, user);

      await request(app.getHttpServer())
        .get('/api/v1/applications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('returns application detail when found', async () => {
      const user = await createTestUser(prismaService, {
        email: 'apptest-getone2@example.com',
        username: 'apptestgetone2',
      });
      const token = createTestJWT(jwtService, user);

      const seeded = await prismaService.application.create({
        data: {
          userId: user.id,
          company: 'Acme Corp',
          roleTitle: 'Senior Engineer',
          jobPostingText: 'Looking for an engineer...',
          status: 'ready',
          analysis: {
            overallSignal: 'strong',
            narrative: 'Great fit',
            categories: [],
          },
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${seeded.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.id).toBe(seeded.id);
      expect(res.body.analysis.overallSignal).toBe('strong');
    });
  });

  describe('PATCH /api/v1/applications/:id/status', () => {
    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/applications/some-id/status')
        .send({ status: 'applied' })
        .expect(401);
    });

    it('returns 404 when application does not exist', async () => {
      const user = await createTestUser(prismaService, {
        email: 'apptest-patch404@example.com',
        username: 'apptestpatch404',
      });
      const token = createTestJWT(jwtService, user);

      await request(app.getHttpServer())
        .patch(
          '/api/v1/applications/00000000-0000-0000-0000-000000000000/status'
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'applied' })
        .expect(404);
    });

    it('returns 400 when status is invalid', async () => {
      const user = await createTestUser(prismaService, {
        email: 'apptest-patch400@example.com',
        username: 'apptestpatch400',
      });
      const token = createTestJWT(jwtService, user);

      const seeded = await prismaService.application.create({
        data: {
          userId: user.id,
          company: 'Acme Corp',
          roleTitle: 'Senior Engineer',
          jobPostingText: 'Looking for an engineer...',
          status: 'ready',
          analysis: {},
        },
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/applications/${seeded.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'interviewing' })
        .expect(400);
    });

    it('updates status and sets appliedAt when transitioning to applied', async () => {
      const user = await createTestUser(prismaService, {
        email: 'apptest-patchapply@example.com',
        username: 'apptestpatchapply',
      });
      const token = createTestJWT(jwtService, user);

      const seeded = await prismaService.application.create({
        data: {
          userId: user.id,
          company: 'Acme Corp',
          roleTitle: 'Senior Engineer',
          jobPostingText: 'Looking for an engineer...',
          status: 'ready',
          analysis: {},
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/applications/${seeded.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'applied' })
        .expect(200);

      expect(res.body.status).toBe('applied');
      expect(res.body.appliedAt).toBeTruthy();
    });
  });

  describe('POST /api/v1/applications', () => {
    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/applications')
        .send({ jobPostingText: 'Some job posting' })
        .expect(401);
    });

    it('returns 400 when jobPostingText is missing', async () => {
      const user = await createTestUser(prismaService, {
        email: 'apptest-post400@example.com',
        username: 'apptestpost400',
      });
      const token = createTestJWT(jwtService, user);

      await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('returns 400 when jobPostingText is too short', async () => {
      const user = await createTestUser(prismaService, {
        email: 'apptest-post400short@example.com',
        username: 'apptestpost400short',
      });
      const token = createTestJWT(jwtService, user);

      await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ jobPostingText: 'Short text' })
        .expect(400);
    });
  });
});
