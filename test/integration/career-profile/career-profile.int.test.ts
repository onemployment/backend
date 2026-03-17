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
