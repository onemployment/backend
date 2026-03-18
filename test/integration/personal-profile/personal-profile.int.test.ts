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

const validUpdateBody = {
  professionalIdentity: {
    narrative:
      'A senior software engineer focused on distributed systems and team leadership.',
  },
  coreValues: [
    { label: 'autonomy', context: 'I work best when given ownership.' },
    { label: 'impact', context: null },
  ],
};

async function seedPersonalProfile(
  prisma: PrismaService,
  userId: string
): Promise<void> {
  await prisma.personalProfile.create({
    data: {
      userId,
      professionalIdentity: { narrative: 'A software engineer.' },
      coreValues: [],
    },
  });
}

describe('Personal Profile Integration Tests', () => {
  let testSetup: TestAppSetup;
  let app: INestApplication;
  let jwtService: JwtService;
  let prisma: PrismaService;

  beforeAll(async () => {
    testSetup = await createTestApp();
    app = testSetup.app;
    jwtService = testSetup.jwtService;
    prisma = testSetup.prismaService;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/personal-profile', () => {
    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/personal-profile')
        .expect(401);
    });

    it('returns 404 when user has no personal profile', async () => {
      const user = await createTestUser(prisma, {
        email: 'pp-get-none@example.com',
        username: 'ppGetNone',
      });
      const token = createTestJWT(jwtService, user);
      await request(app.getHttpServer())
        .get('/api/v1/personal-profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('returns 200 with personal profile when it exists', async () => {
      const user = await createTestUser(prisma, {
        email: 'pp-get-exists@example.com',
        username: 'ppGetExists',
      });
      const token = createTestJWT(jwtService, user);
      await seedPersonalProfile(prisma, user.id);

      const res = await request(app.getHttpServer())
        .get('/api/v1/personal-profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.userId).toBe(user.id);
      expect(res.body.professionalIdentity.narrative).toBe(
        'A software engineer.'
      );
      expect(Array.isArray(res.body.coreValues)).toBe(true);
    });
  });

  describe('PUT /api/v1/personal-profile', () => {
    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/personal-profile')
        .send(validUpdateBody)
        .expect(401);
    });

    it('returns 404 when user has no personal profile', async () => {
      const user = await createTestUser(prisma, {
        email: 'pp-put-none@example.com',
        username: 'ppPutNone',
      });
      const token = createTestJWT(jwtService, user);
      await request(app.getHttpServer())
        .put('/api/v1/personal-profile')
        .set('Authorization', `Bearer ${token}`)
        .send(validUpdateBody)
        .expect(404);
    });

    it('returns 400 for invalid body', async () => {
      const user = await createTestUser(prisma, {
        email: 'pp-put-bad@example.com',
        username: 'ppPutBad',
      });
      const token = createTestJWT(jwtService, user);
      await seedPersonalProfile(prisma, user.id);
      await request(app.getHttpServer())
        .put('/api/v1/personal-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ professionalIdentity: 'not an object' })
        .expect(400);
    });

    it('returns 200 with updated profile', async () => {
      const user = await createTestUser(prisma, {
        email: 'pp-put-ok@example.com',
        username: 'ppPutOk',
      });
      const token = createTestJWT(jwtService, user);
      await seedPersonalProfile(prisma, user.id);

      const res = await request(app.getHttpServer())
        .put('/api/v1/personal-profile')
        .set('Authorization', `Bearer ${token}`)
        .send(validUpdateBody)
        .expect(200);

      expect(res.body.professionalIdentity.narrative).toBe(
        validUpdateBody.professionalIdentity.narrative
      );
      expect(res.body.coreValues).toHaveLength(2);
      expect(res.body.coreValues[0].label).toBe('autonomy');
    });
  });

  describe('POST /api/v1/personal-profile/extract', () => {
    it('returns 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/personal-profile/extract')
        .send({ text: 'some text' })
        .expect(401);
    });

    it('returns 400 when text is empty string', async () => {
      const user = await createTestUser(prisma, {
        email: 'pp-extract-empty@example.com',
        username: 'ppExtractEmpty',
      });
      const token = createTestJWT(jwtService, user);
      await request(app.getHttpServer())
        .post('/api/v1/personal-profile/extract')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: '' })
        .expect(400);
    });

    it('returns 400 when text field is missing', async () => {
      const user = await createTestUser(prisma, {
        email: 'pp-extract-missing@example.com',
        username: 'ppExtractMissing',
      });
      const token = createTestJWT(jwtService, user);
      await request(app.getHttpServer())
        .post('/api/v1/personal-profile/extract')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });
  });
});
